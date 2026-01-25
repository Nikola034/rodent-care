use axum::{
    extract::{Query, State},
    http::{header, HeaderMap},
    Json,
};
use bson::{doc, Document};
use chrono::{DateTime, Duration, Utc};
use futures::TryStreamExt;
use jsonwebtoken::{decode, DecodingKey, Validation};
use std::sync::Arc;

use crate::error::AppError;
use crate::models::*;
use crate::AppState;

// ============== Helper Functions ==============

fn extract_auth_info(state: &AppState, headers: &HeaderMap) -> Result<AuthInfo, AppError> {
    let auth_header = headers
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::InvalidToken)?;

    let token = if auth_header.starts_with("Bearer ") {
        &auth_header[7..]
    } else {
        return Err(AppError::InvalidToken);
    };

    let claims = decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| {
        tracing::debug!("Token validation failed: {:?}", e);
        match e.kind() {
            jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::TokenExpired,
            _ => AppError::InvalidToken,
        }
    })?
    .claims;

    Ok(AuthInfo::from(claims))
}

fn can_view_analytics(role: &str) -> bool {
    matches!(role, "admin" | "caretaker" | "veterinarian")
}

fn get_date_range(from: Option<DateTime<Utc>>, to: Option<DateTime<Utc>>) -> (DateTime<Utc>, DateTime<Utc>) {
    let to_date = to.unwrap_or_else(Utc::now);
    let from_date = from.unwrap_or_else(|| to_date - Duration::days(30));
    (from_date, to_date)
}

// Helper function to get numeric value from BSON document (handles both i32 and i64)
fn get_number_as_i64(doc: &Document, key: &str) -> i64 {
    if let Ok(val) = doc.get_i64(key) {
        val
    } else if let Ok(val) = doc.get_i32(key) {
        val as i64
    } else if let Ok(val) = doc.get_f64(key) {
        val as i64
    } else {
        0
    }
}

fn get_number_as_f64(doc: &Document, key: &str) -> f64 {
    if let Ok(val) = doc.get_f64(key) {
        val
    } else if let Ok(val) = doc.get_i64(key) {
        val as f64
    } else if let Ok(val) = doc.get_i32(key) {
        val as f64
    } else {
        0.0
    }
}

/// Helper function to get rodent ObjectIds filtered by species
/// Returns None if no species filter is applied (meaning all rodents)
async fn get_rodent_ids_by_species(
    state: &AppState,
    species: Option<&String>,
) -> Result<Option<Vec<bson::oid::ObjectId>>, AppError> {
    match species {
        Some(species_filter) if !species_filter.is_empty() => {
            let rodents_collection = state.db.rodent_db.collection::<Document>("rodents");
            let cursor = rodents_collection
                .find(doc! { "species": species_filter }, None)
                .await?;
            let rodents: Vec<Document> = cursor.try_collect().await?;
            let ids: Vec<bson::oid::ObjectId> = rodents
                .iter()
                .filter_map(|doc| doc.get_object_id("_id").ok())
                .collect();
            Ok(Some(ids))
        }
        _ => Ok(None), // No filter - return None to indicate all rodents
    }
}

/// Build a match document that includes rodent_id filter if species is specified
fn build_rodent_filter(rodent_ids: &Option<Vec<bson::oid::ObjectId>>) -> Option<Document> {
    rodent_ids.as_ref().map(|ids| {
        doc! { "rodent_id": { "$in": ids } }
    })
}

/// Helper function to get rodent names by their IDs
/// Returns a HashMap mapping rodent ID (hex string) to name
async fn get_rodent_names_by_ids(
    state: &AppState,
    rodent_ids: &[String],
) -> Result<std::collections::HashMap<String, String>, AppError> {
    use std::collections::HashMap;
    
    if rodent_ids.is_empty() {
        return Ok(HashMap::new());
    }
    
    // Convert string IDs to ObjectIds
    let object_ids: Vec<bson::oid::ObjectId> = rodent_ids
        .iter()
        .filter_map(|id| bson::oid::ObjectId::parse_str(id).ok())
        .collect();
    
    let rodents_collection = state.db.rodent_db.collection::<Document>("rodents");
    let cursor = rodents_collection
        .find(doc! { "_id": { "$in": &object_ids } }, None)
        .await?;
    let rodents: Vec<Document> = cursor.try_collect().await?;
    
    let mut names_map = HashMap::new();
    for rodent in rodents {
        if let (Ok(id), Ok(name)) = (rodent.get_object_id("_id"), rodent.get_str("name")) {
            names_map.insert(id.to_hex(), name.to_string());
        }
    }
    
    Ok(names_map)
}

// ============== Population Analytics ==============

pub async fn get_population_stats(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<AnalyticsQueryParams>,
) -> Result<Json<PopulationStatsResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let rodents_collection = state.db.rodent_db.collection::<Document>("rodents");

    // Build base filter
    let base_filter = if let Some(species) = &params.species {
        doc! { "species": species }
    } else {
        doc! {}
    };

    // Total count (with filter)
    let total_rodents = rodents_collection.count_documents(base_filter.clone(), None).await?;

    // By species
    let mut species_pipeline = vec![];
    if let Some(species) = &params.species {
        species_pipeline.push(doc! { "$match": { "species": species } });
    }
    species_pipeline.push(doc! { "$group": { "_id": "$species", "count": { "$sum": 1 } } });
    species_pipeline.push(doc! { "$sort": { "count": -1 } });
    let mut species_cursor = rodents_collection.aggregate(species_pipeline, None).await?;
    let mut by_species = Vec::new();
    while let Some(doc) = species_cursor.try_next().await? {
        let species = doc.get_str("_id").unwrap_or("unknown").to_string();
        let count = get_number_as_i64(&doc, "count");
        let percentage = if total_rodents > 0 {
            (count as f64 / total_rodents as f64) * 100.0
        } else {
            0.0
        };
        by_species.push(SpeciesCount { species, count, percentage });
    }

    // By gender
    let mut gender_pipeline = vec![];
    if let Some(species) = &params.species {
        gender_pipeline.push(doc! { "$match": { "species": species } });
    }
    gender_pipeline.push(doc! { "$group": { "_id": "$gender", "count": { "$sum": 1 } } });
    let mut gender_cursor = rodents_collection.aggregate(gender_pipeline, None).await?;
    let mut by_gender = GenderDistribution { male: 0, female: 0, unknown: 0 };
    while let Some(doc) = gender_cursor.try_next().await? {
        let gender = doc.get_str("_id").unwrap_or("unknown");
        let count = get_number_as_i64(&doc, "count");
        match gender {
            "male" => by_gender.male = count,
            "female" => by_gender.female = count,
            _ => by_gender.unknown = count,
        }
    }

    // By status
    let mut status_pipeline = vec![];
    if let Some(species) = &params.species {
        status_pipeline.push(doc! { "$match": { "species": species } });
    }
    status_pipeline.push(doc! { "$group": { "_id": "$status", "count": { "$sum": 1 } } });
    status_pipeline.push(doc! { "$sort": { "count": -1 } });
    let mut status_cursor = rodents_collection.aggregate(status_pipeline, None).await?;
    let mut by_status = Vec::new();
    while let Some(doc) = status_cursor.try_next().await? {
        let status = doc.get_str("_id").unwrap_or("unknown").to_string();
        let count = get_number_as_i64(&doc, "count");
        by_status.push(StatusCount { status, count });
    }

    // By age group
    let mut age_pipeline = vec![];
    if let Some(species) = &params.species {
        age_pipeline.push(doc! { "$match": { "species": species } });
    }
    age_pipeline.push(doc! {
        "$bucket": {
            "groupBy": "$age_months",
            "boundaries": [0, 3, 6, 12, 24, 100],
            "default": "unknown",
            "output": { "count": { "$sum": 1 } }
        }
    });
    let mut age_cursor = rodents_collection.aggregate(age_pipeline, None).await?;
    let mut by_age_group = Vec::new();
    let age_labels = ["0-3 months", "3-6 months", "6-12 months", "1-2 years", "2+ years"];
    let mut idx = 0;
    while let Some(doc) = age_cursor.try_next().await? {
        let count = get_number_as_i64(&doc, "count");
        let age_group = age_labels.get(idx).unwrap_or(&"unknown").to_string();
        by_age_group.push(AgeGroupCount { age_group, count });
        idx += 1;
    }

    // Recent intakes (last 30 days)
    let thirty_days_ago = Utc::now() - Duration::days(30);
    let mut intake_filter = doc! { "intake_date": { "$gte": thirty_days_ago } };
    if let Some(species) = &params.species {
        intake_filter.insert("species", species);
    }
    let recent_intakes = rodents_collection.count_documents(intake_filter, None).await?;

    // Recent adoptions (last 30 days)
    let status_history = state.db.rodent_db.collection::<Document>("status_history");
    let recent_adoptions = status_history.count_documents(doc! {
        "new_status": "adopted",
        "changed_at": { "$gte": thirty_days_ago }
    }, None).await?;

    Ok(Json(PopulationStatsResponse {
        success: true,
        total_rodents: total_rodents as i64,
        by_species,
        by_gender,
        by_status,
        by_age_group,
        recent_intakes: recent_intakes as i64,
        recent_adoptions: recent_adoptions as i64,
    }))
}

// ============== Health Analytics ==============

pub async fn get_health_analytics(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<AnalyticsQueryParams>,
) -> Result<Json<HealthAnalyticsResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let (from_date, to_date) = get_date_range(params.from_date, params.to_date);

    // Get rodent IDs filtered by species if specified
    let rodent_ids = get_rodent_ids_by_species(&state, params.species.as_ref()).await?;
    
    // Build base match filter
    let mut base_match = doc! {
        "date": { "$gte": from_date, "$lte": to_date }
    };
    if let Some(ref filter) = build_rodent_filter(&rodent_ids) {
        base_match.extend(filter.clone());
    }

    let daily_records = state.db.activity_db.collection::<Document>("daily_records");

    // Weight trends over time
    let mut weight_match = base_match.clone();
    weight_match.insert("weight_grams", doc! { "$exists": true, "$ne": null });
    
    let weight_pipeline = vec![
        doc! { "$match": weight_match },
        doc! {
            "$group": {
                "_id": { "$dateToString": { "format": "%Y-%m-%d", "date": "$date" } },
                "avg_weight": { "$avg": "$weight_grams" },
                "min_weight": { "$min": "$weight_grams" },
                "max_weight": { "$max": "$weight_grams" },
                "rodent_count": { "$addToSet": "$rodent_id" }
            }
        },
        doc! { "$sort": { "_id": 1 } },
        doc! {
            "$project": {
                "_id": 1,
                "avg_weight": 1,
                "min_weight": 1,
                "max_weight": 1,
                "rodent_count": { "$size": "$rodent_count" }
            }
        },
    ];

    let mut weight_cursor = daily_records.aggregate(weight_pipeline, None).await?;
    let mut weight_trends = Vec::new();
    while let Some(doc) = weight_cursor.try_next().await? {
        weight_trends.push(WeightTrendData {
            date: doc.get_str("_id").unwrap_or("").to_string(),
            avg_weight: get_number_as_f64(&doc, "avg_weight"),
            min_weight: get_number_as_f64(&doc, "min_weight"),
            max_weight: get_number_as_f64(&doc, "max_weight"),
            rodent_count: get_number_as_i64(&doc, "rodent_count"),
        });
    }

    // Note: Cross-database lookups are not supported in MongoDB, so we'll skip this for now
    let avg_weight_by_species: Vec<SpeciesWeightAvg> = Vec::new();

    // Energy level distribution
    let mut energy_match = base_match.clone();
    energy_match.insert("energy_level", doc! { "$exists": true, "$ne": null });
    
    let energy_pipeline = vec![
        doc! { "$match": energy_match },
        doc! {
            "$group": {
                "_id": "$energy_level",
                "count": { "$sum": 1 }
            }
        },
        doc! { "$sort": { "_id": 1 } },
    ];

    let mut energy_cursor = daily_records.aggregate(energy_pipeline, None).await?;
    let mut energy_level_distribution = Vec::new();
    while let Some(doc) = energy_cursor.try_next().await? {
        energy_level_distribution.push(LevelDistribution {
            level: get_number_as_i64(&doc, "_id") as i32,
            count: get_number_as_i64(&doc, "count"),
        });
    }

    // Mood level distribution
    let mut mood_match = base_match.clone();
    mood_match.insert("mood_level", doc! { "$exists": true, "$ne": null });
    
    let mood_pipeline = vec![
        doc! { "$match": mood_match },
        doc! {
            "$group": {
                "_id": "$mood_level",
                "count": { "$sum": 1 }
            }
        },
        doc! { "$sort": { "_id": 1 } },
    ];

    let mut mood_cursor = daily_records.aggregate(mood_pipeline, None).await?;
    let mut mood_level_distribution = Vec::new();
    while let Some(doc) = mood_cursor.try_next().await? {
        mood_level_distribution.push(LevelDistribution {
            level: get_number_as_i64(&doc, "_id") as i32,
            count: get_number_as_i64(&doc, "count"),
        });
    }

    // Health observations count
    let mut health_obs_match = base_match.clone();
    health_obs_match.insert("health_observations", doc! { "$exists": true, "$ne": null, "$ne": "" });
    
    let health_observations_count = daily_records.count_documents(health_obs_match, None).await? as i64;

    Ok(Json(HealthAnalyticsResponse {
        success: true,
        weight_trends,
        avg_weight_by_species,
        energy_level_distribution,
        mood_level_distribution,
        health_observations_count,
    }))
}

// ============== Activity Analytics ==============

pub async fn get_activity_analytics(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<AnalyticsQueryParams>,
) -> Result<Json<ActivityAnalyticsResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let (from_date, to_date) = get_date_range(params.from_date, params.to_date);

    // Get rodent IDs filtered by species if specified
    let rodent_ids = get_rodent_ids_by_species(&state, params.species.as_ref()).await?;
    
    // Build base match filter
    let mut base_match = doc! {
        "recorded_at": { "$gte": from_date, "$lte": to_date }
    };
    if let Some(ref filter) = build_rodent_filter(&rodent_ids) {
        base_match.extend(filter.clone());
    }

    let activities = state.db.activity_db.collection::<Document>("activities");

    // Total activity minutes
    let total_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": null, "total_minutes": { "$sum": "$duration_minutes" }, "session_count": { "$sum": 1 } } },
    ];

    let mut total_cursor = activities.aggregate(total_pipeline, None).await?;
    let (total_activity_minutes, _total_sessions) = if let Some(doc) = total_cursor.try_next().await? {
        (get_number_as_i64(&doc, "total_minutes"), get_number_as_i64(&doc, "session_count"))
    } else {
        (0, 0)
    };

    let days_in_range = (to_date - from_date).num_days().max(1);
    let avg_daily_activity = total_activity_minutes as f64 / days_in_range as f64;

    // By activity type
    let type_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": "$activity_type", "total_minutes": { "$sum": "$duration_minutes" }, "session_count": { "$sum": 1 } } },
        doc! { "$sort": { "total_minutes": -1 } },
    ];

    let mut type_cursor = activities.aggregate(type_pipeline, None).await?;
    let mut by_activity_type = Vec::new();
    while let Some(doc) = type_cursor.try_next().await? {
        let total_minutes = get_number_as_i64(&doc, "total_minutes");
        let session_count = get_number_as_i64(&doc, "session_count");
        by_activity_type.push(ActivityTypeStats {
            activity_type: doc.get_str("_id").unwrap_or("unknown").to_string(),
            total_minutes,
            session_count,
            avg_duration: if session_count > 0 { total_minutes as f64 / session_count as f64 } else { 0.0 },
        });
    }

    // Activity by hour
    let hour_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": { "$hour": "$recorded_at" }, "total_minutes": { "$sum": "$duration_minutes" }, "session_count": { "$sum": 1 } } },
        doc! { "$sort": { "_id": 1 } },
    ];

    let mut hour_cursor = activities.aggregate(hour_pipeline, None).await?;
    let mut activity_by_hour = Vec::new();
    while let Some(doc) = hour_cursor.try_next().await? {
        activity_by_hour.push(HourlyActivity {
            hour: get_number_as_i64(&doc, "_id") as i32,
            total_minutes: get_number_as_i64(&doc, "total_minutes"),
            session_count: get_number_as_i64(&doc, "session_count"),
        });
    }

    // Activity by day of week
    let day_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": { "$dayOfWeek": "$recorded_at" }, "total_minutes": { "$sum": "$duration_minutes" }, "session_count": { "$sum": 1 } } },
        doc! { "$sort": { "_id": 1 } },
    ];

    let mut day_cursor = activities.aggregate(day_pipeline, None).await?;
    let mut activity_by_day_of_week = Vec::new();
    let day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    while let Some(doc) = day_cursor.try_next().await? {
        let day_num = get_number_as_i64(&doc, "_id") as usize;
        activity_by_day_of_week.push(DayOfWeekActivity {
            day: day_names.get(day_num.saturating_sub(1)).unwrap_or(&"Unknown").to_string(),
            total_minutes: get_number_as_i64(&doc, "total_minutes"),
            session_count: get_number_as_i64(&doc, "session_count"),
        });
    }

    // Most active rodents
    let active_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": "$rodent_id", "total_minutes": { "$sum": "$duration_minutes" }, "session_count": { "$sum": 1 } } },
        doc! { "$sort": { "total_minutes": -1 } },
        doc! { "$limit": 10 },
    ];

    let mut active_cursor = activities.aggregate(active_pipeline, None).await?;
    let mut rodent_stats_temp = Vec::new();
    while let Some(doc) = active_cursor.try_next().await? {
        let rodent_id = doc.get_object_id("_id").map(|id| id.to_hex()).unwrap_or_else(|_| "unknown".to_string());
        rodent_stats_temp.push((
            rodent_id,
            get_number_as_i64(&doc, "total_minutes"),
            get_number_as_i64(&doc, "session_count"),
        ));
    }
    
    // Look up real rodent names
    let rodent_ids: Vec<String> = rodent_stats_temp.iter().map(|(id, _, _)| id.clone()).collect();
    let names_map = get_rodent_names_by_ids(&state, &rodent_ids).await?;
    
    let most_active_rodents: Vec<RodentActivityStats> = rodent_stats_temp
        .into_iter()
        .map(|(rodent_id, total_minutes, session_count)| {
            let rodent_name = names_map.get(&rodent_id)
                .cloned()
                .unwrap_or_else(|| format!("Rodent {}", &rodent_id[..8.min(rodent_id.len())]));
            RodentActivityStats {
                rodent_id,
                rodent_name,
                total_minutes,
                session_count,
            }
        })
        .collect();

    Ok(Json(ActivityAnalyticsResponse {
        success: true,
        total_activity_minutes,
        avg_daily_activity,
        by_activity_type,
        activity_by_hour,
        activity_by_day_of_week,
        most_active_rodents,
    }))
}

// ============== Feeding Analytics ==============

pub async fn get_feeding_analytics(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<AnalyticsQueryParams>,
) -> Result<Json<FeedingAnalyticsResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let (from_date, to_date) = get_date_range(params.from_date, params.to_date);

    // Get rodent IDs filtered by species if specified
    let rodent_ids = get_rodent_ids_by_species(&state, params.species.as_ref()).await?;
    
    // Build base match filter
    let mut base_match = doc! {
        "meal_time": { "$gte": from_date, "$lte": to_date }
    };
    if let Some(ref filter) = build_rodent_filter(&rodent_ids) {
        base_match.extend(filter.clone());
    }

    let feeding_records = state.db.activity_db.collection::<Document>("feeding_records");

    // Total food consumption
    let total_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": null, "total_grams": { "$sum": "$quantity_grams" }, "feeding_count": { "$sum": 1 }, "consumed_fully_count": { "$sum": { "$cond": [{ "$eq": ["$consumed_fully", true] }, 1, 0] } } } },
    ];

    let mut total_cursor = feeding_records.aggregate(total_pipeline, None).await?;
    let (total_food_grams, feeding_count, consumed_fully_count) = if let Some(doc) = total_cursor.try_next().await? {
        (get_number_as_f64(&doc, "total_grams"), get_number_as_i64(&doc, "feeding_count"), get_number_as_i64(&doc, "consumed_fully_count"))
    } else {
        (0.0, 0, 0)
    };

    let days_in_range = (to_date - from_date).num_days().max(1);
    let avg_daily_food = total_food_grams / days_in_range as f64;
    let consumption_rate = if feeding_count > 0 { consumed_fully_count as f64 / feeding_count as f64 * 100.0 } else { 0.0 };

    // By food type
    let type_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": "$food_type", "total_grams": { "$sum": "$quantity_grams" }, "feeding_count": { "$sum": 1 } } },
        doc! { "$sort": { "total_grams": -1 } },
    ];

    let mut type_cursor = feeding_records.aggregate(type_pipeline, None).await?;
    let mut by_food_type = Vec::new();
    while let Some(doc) = type_cursor.try_next().await? {
        let total_grams = get_number_as_f64(&doc, "total_grams");
        let feeding_count = get_number_as_i64(&doc, "feeding_count");
        by_food_type.push(FoodTypeStats {
            food_type: doc.get_str("_id").unwrap_or("unknown").to_string(),
            total_grams,
            feeding_count,
            avg_quantity: if feeding_count > 0 { total_grams / feeding_count as f64 } else { 0.0 },
        });
    }

    // Feeding by hour
    let hour_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": { "$hour": "$meal_time" }, "total_grams": { "$sum": "$quantity_grams" }, "feeding_count": { "$sum": 1 } } },
        doc! { "$sort": { "_id": 1 } },
    ];

    let mut hour_cursor = feeding_records.aggregate(hour_pipeline, None).await?;
    let mut feeding_by_hour = Vec::new();
    while let Some(doc) = hour_cursor.try_next().await? {
        feeding_by_hour.push(HourlyFeeding {
            hour: get_number_as_i64(&doc, "_id") as i32,
            total_grams: get_number_as_f64(&doc, "total_grams"),
            feeding_count: get_number_as_i64(&doc, "feeding_count"),
        });
    }

    // Top consumers
    let consumers_pipeline = vec![
        doc! { "$match": base_match.clone() },
        doc! { "$group": { "_id": "$rodent_id", "total_grams": { "$sum": "$quantity_grams" }, "feeding_count": { "$sum": 1 } } },
        doc! { "$sort": { "total_grams": -1 } },
        doc! { "$limit": 10 },
    ];

    let mut consumers_cursor = feeding_records.aggregate(consumers_pipeline, None).await?;
    let mut consumer_stats_temp = Vec::new();
    while let Some(doc) = consumers_cursor.try_next().await? {
        let rodent_id = doc.get_object_id("_id").map(|id| id.to_hex()).unwrap_or_else(|_| "unknown".to_string());
        consumer_stats_temp.push((
            rodent_id,
            get_number_as_f64(&doc, "total_grams"),
            get_number_as_i64(&doc, "feeding_count"),
        ));
    }
    
    // Look up real rodent names
    let rodent_ids: Vec<String> = consumer_stats_temp.iter().map(|(id, _, _)| id.clone()).collect();
    let names_map = get_rodent_names_by_ids(&state, &rodent_ids).await?;
    
    let top_consumers: Vec<RodentFeedingStats> = consumer_stats_temp
        .into_iter()
        .map(|(rodent_id, total_grams, feeding_count)| {
            let rodent_name = names_map.get(&rodent_id)
                .cloned()
                .unwrap_or_else(|| format!("Rodent {}", &rodent_id[..8.min(rodent_id.len())]));
            RodentFeedingStats {
                rodent_id,
                rodent_name,
                total_grams,
                feeding_count,
            }
        })
        .collect();

    Ok(Json(FeedingAnalyticsResponse {
        success: true,
        total_food_grams,
        avg_daily_food,
        by_food_type,
        feeding_by_hour,
        consumption_rate,
        top_consumers,
    }))
}

// ============== Dashboard Summary ==============

pub async fn get_dashboard_summary(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<DashboardSummaryResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let now = Utc::now();
    let today_start = now.date_naive().and_hms_opt(0, 0, 0)
        .map(|dt| DateTime::<Utc>::from_naive_utc_and_offset(dt, Utc))
        .unwrap_or(now);
    let week_ago = now - Duration::days(7);

    // Population summary
    let rodents_collection = state.db.rodent_db.collection::<Document>("rodents");
    let total_rodents = rodents_collection.count_documents(doc! {}, None).await? as i64;
    let available_for_adoption = rodents_collection.count_documents(doc! { "status": "available" }, None).await? as i64;
    let in_medical_care = rodents_collection.count_documents(doc! { "status": "medical_care" }, None).await? as i64;
    let recent_intakes_week = rodents_collection.count_documents(doc! { "intake_date": { "$gte": week_ago } }, None).await? as i64;

    // Activity summary
    let activities = state.db.activity_db.collection::<Document>("activities");

    let today_activity_pipeline = vec![
        doc! { "$match": { "recorded_at": { "$gte": today_start } } },
        doc! { "$group": { "_id": null, "total_minutes": { "$sum": "$duration_minutes" }, "rodent_ids": { "$addToSet": "$rodent_id" } } },
    ];
    let mut today_cursor = activities.aggregate(today_activity_pipeline, None).await?;
    let (total_minutes_today, active_rodents_today) = if let Some(doc) = today_cursor.try_next().await? {
        let rodent_ids = doc.get_array("rodent_ids").map(|a| a.len()).unwrap_or(0);
        (get_number_as_i64(&doc, "total_minutes"), rodent_ids as i64)
    } else {
        (0, 0)
    };

    let week_activity_pipeline = vec![
        doc! { "$match": { "recorded_at": { "$gte": week_ago } } },
        doc! { "$group": { "_id": null, "total_minutes": { "$sum": "$duration_minutes" } } },
    ];
    let mut week_cursor = activities.aggregate(week_activity_pipeline, None).await?;
    let total_minutes_week = if let Some(doc) = week_cursor.try_next().await? {
        get_number_as_i64(&doc, "total_minutes")
    } else {
        0
    };

    let most_common_pipeline = vec![
        doc! { "$match": { "recorded_at": { "$gte": week_ago } } },
        doc! { "$group": { "_id": "$activity_type", "count": { "$sum": 1 } } },
        doc! { "$sort": { "count": -1 } },
        doc! { "$limit": 1 },
    ];
    let mut common_cursor = activities.aggregate(most_common_pipeline, None).await?;
    let most_common_activity = if let Some(doc) = common_cursor.try_next().await? {
        Some(doc.get_str("_id").unwrap_or("unknown").to_string())
    } else {
        None
    };

    // Feeding summary
    let feeding_records = state.db.activity_db.collection::<Document>("feeding_records");

    let today_feeding_pipeline = vec![
        doc! { "$match": { "meal_time": { "$gte": today_start } } },
        doc! { "$group": { "_id": null, "total_grams": { "$sum": "$quantity_grams" }, "count": { "$sum": 1 } } },
    ];
    let mut today_feeding_cursor = feeding_records.aggregate(today_feeding_pipeline, None).await?;
    let (total_grams_today, feedings_today) = if let Some(doc) = today_feeding_cursor.try_next().await? {
        (get_number_as_f64(&doc, "total_grams"), get_number_as_i64(&doc, "count"))
    } else {
        (0.0, 0)
    };

    let week_feeding_pipeline = vec![
        doc! { "$match": { "meal_time": { "$gte": week_ago } } },
        doc! { "$group": { "_id": null, "total_grams": { "$sum": "$quantity_grams" }, "count": { "$sum": 1 } } },
    ];
    let mut week_feeding_cursor = feeding_records.aggregate(week_feeding_pipeline, None).await?;
    let (total_grams_week, feedings_week) = if let Some(doc) = week_feeding_cursor.try_next().await? {
        (get_number_as_f64(&doc, "total_grams"), get_number_as_i64(&doc, "count"))
    } else {
        (0.0, 0)
    };

    let recent_events = Vec::new();

    Ok(Json(DashboardSummaryResponse {
        success: true,
        population: PopulationSummary {
            total_rodents,
            available_for_adoption,
            in_medical_care,
            recent_intakes_week,
        },
        activity: ActivitySummary {
            total_minutes_today,
            total_minutes_week,
            most_common_activity,
            active_rodents_today,
        },
        feeding: FeedingSummary {
            total_grams_today,
            total_grams_week,
            feedings_today,
            feedings_week,
        },
        recent_events,
    }))
}

// ============== Trend Data ==============

pub async fn get_weight_trends(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<AnalyticsQueryParams>,
) -> Result<Json<TrendDataResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let (from_date, to_date) = get_date_range(params.from_date, params.to_date);

    // Get rodent IDs filtered by species if specified
    let rodent_ids = get_rodent_ids_by_species(&state, params.species.as_ref()).await?;
    
    // Build base match filter
    let mut base_match = doc! {
        "date": { "$gte": from_date, "$lte": to_date },
        "weight_grams": { "$exists": true, "$ne": null }
    };
    if let Some(ref filter) = build_rodent_filter(&rodent_ids) {
        base_match.extend(filter.clone());
    }

    let daily_records = state.db.activity_db.collection::<Document>("daily_records");

    let pipeline = vec![
        doc! { "$match": base_match },
        doc! { "$group": { "_id": { "$dateToString": { "format": "%Y-%m-%d", "date": "$date" } }, "value": { "$avg": "$weight_grams" }, "count": { "$sum": 1 } } },
        doc! { "$sort": { "_id": 1 } },
    ];

    let mut cursor = daily_records.aggregate(pipeline, None).await?;
    let mut data_points = Vec::new();
    while let Some(doc) = cursor.try_next().await? {
        data_points.push(TrendDataPoint {
            date: doc.get_str("_id").unwrap_or("").to_string(),
            value: get_number_as_f64(&doc, "value"),
            count: get_number_as_i64(&doc, "count"),
        });
    }

    Ok(Json(TrendDataResponse {
        success: true,
        period: format!("{} to {}", from_date.format("%Y-%m-%d"), to_date.format("%Y-%m-%d")),
        data_points,
    }))
}

pub async fn get_activity_trends(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<AnalyticsQueryParams>,
) -> Result<Json<TrendDataResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let (from_date, to_date) = get_date_range(params.from_date, params.to_date);

    // Get rodent IDs filtered by species if specified
    let rodent_ids = get_rodent_ids_by_species(&state, params.species.as_ref()).await?;
    
    // Build base match filter
    let mut base_match = doc! {
        "recorded_at": { "$gte": from_date, "$lte": to_date }
    };
    if let Some(ref filter) = build_rodent_filter(&rodent_ids) {
        base_match.extend(filter.clone());
    }

    let activities = state.db.activity_db.collection::<Document>("activities");

    let pipeline = vec![
        doc! { "$match": base_match },
        doc! { "$group": { "_id": { "$dateToString": { "format": "%Y-%m-%d", "date": "$recorded_at" } }, "value": { "$sum": "$duration_minutes" }, "count": { "$sum": 1 } } },
        doc! { "$sort": { "_id": 1 } },
    ];

    let mut cursor = activities.aggregate(pipeline, None).await?;
    let mut data_points = Vec::new();
    while let Some(doc) = cursor.try_next().await? {
        data_points.push(TrendDataPoint {
            date: doc.get_str("_id").unwrap_or("").to_string(),
            value: get_number_as_f64(&doc, "value"),
            count: get_number_as_i64(&doc, "count"),
        });
    }

    Ok(Json(TrendDataResponse {
        success: true,
        period: format!("{} to {}", from_date.format("%Y-%m-%d"), to_date.format("%Y-%m-%d")),
        data_points,
    }))
}

pub async fn get_feeding_trends(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<AnalyticsQueryParams>,
) -> Result<Json<TrendDataResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let (from_date, to_date) = get_date_range(params.from_date, params.to_date);

    // Get rodent IDs filtered by species if specified
    let rodent_ids = get_rodent_ids_by_species(&state, params.species.as_ref()).await?;
    
    // Build base match filter
    let mut base_match = doc! {
        "meal_time": { "$gte": from_date, "$lte": to_date }
    };
    if let Some(ref filter) = build_rodent_filter(&rodent_ids) {
        base_match.extend(filter.clone());
    }

    let feeding_records = state.db.activity_db.collection::<Document>("feeding_records");

    let pipeline = vec![
        doc! { "$match": base_match },
        doc! { "$group": { "_id": { "$dateToString": { "format": "%Y-%m-%d", "date": "$meal_time" } }, "value": { "$sum": "$quantity_grams" }, "count": { "$sum": 1 } } },
        doc! { "$sort": { "_id": 1 } },
    ];

    let mut cursor = feeding_records.aggregate(pipeline, None).await?;
    let mut data_points = Vec::new();
    while let Some(doc) = cursor.try_next().await? {
        data_points.push(TrendDataPoint {
            date: doc.get_str("_id").unwrap_or("").to_string(),
            value: get_number_as_f64(&doc, "value"),
            count: get_number_as_i64(&doc, "count"),
        });
    }

    Ok(Json(TrendDataResponse {
        success: true,
        period: format!("{} to {}", from_date.format("%Y-%m-%d"), to_date.format("%Y-%m-%d")),
        data_points,
    }))
}

// ============== Export Handlers ==============

pub async fn export_population_csv(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<ExportQueryParams>,
) -> Result<String, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let rodents_collection = state.db.rodent_db.collection::<Document>("rodents");

    let mut filter = doc! {};
    if let Some(species) = &params.species {
        filter.insert("species", species);
    }

    let mut cursor = rodents_collection.find(filter, None).await?;

    let mut csv = String::from("id,name,species,gender,age_months,status,intake_date\n");

    while let Some(doc) = cursor.try_next().await? {
        let id = doc.get_object_id("_id").map(|id| id.to_hex()).unwrap_or_default();
        let name = doc.get_str("name").unwrap_or("");
        let species = doc.get_str("species").unwrap_or("");
        let gender = doc.get_str("gender").unwrap_or("");
        let age_months = doc.get_i32("age_months").unwrap_or(0);
        let status = doc.get_str("status").unwrap_or("");
        let intake_date = doc.get_datetime("intake_date")
            .map(|dt| dt.to_chrono().format("%Y-%m-%d").to_string())
            .unwrap_or_default();

        csv.push_str(&format!("{},{},{},{},{},{},{}\n", id, name, species, gender, age_months, status, intake_date));
    }

    Ok(csv)
}

pub async fn export_activity_csv(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<ExportQueryParams>,
) -> Result<String, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let (from_date, to_date) = get_date_range(params.from_date, params.to_date);

    let activities = state.db.activity_db.collection::<Document>("activities");

    let filter = doc! { "recorded_at": { "$gte": from_date, "$lte": to_date } };

    let mut cursor = activities.find(filter, None).await?;

    let mut csv = String::from("id,rodent_id,activity_type,duration_minutes,recorded_at,recorded_by_name\n");

    while let Some(doc) = cursor.try_next().await? {
        let id = doc.get_object_id("_id").map(|id| id.to_hex()).unwrap_or_default();
        let rodent_id = doc.get_object_id("rodent_id").map(|id| id.to_hex()).unwrap_or_default();
        let activity_type = doc.get_str("activity_type").unwrap_or("");
        let duration_minutes = doc.get_i32("duration_minutes").unwrap_or(0);
        let recorded_at = doc.get_datetime("recorded_at")
            .map(|dt| dt.to_chrono().format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_default();
        let recorded_by_name = doc.get_str("recorded_by_name").unwrap_or("");

        csv.push_str(&format!("{},{},{},{},{},{}\n", id, rodent_id, activity_type, duration_minutes, recorded_at, recorded_by_name));
    }

    Ok(csv)
}

pub async fn export_feeding_csv(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Query(params): Query<ExportQueryParams>,
) -> Result<String, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;

    if !can_view_analytics(&auth_info.role) {
        return Err(AppError::AccessDenied("Insufficient permissions".to_string()));
    }

    let (from_date, to_date) = get_date_range(params.from_date, params.to_date);

    let feeding_records = state.db.activity_db.collection::<Document>("feeding_records");

    let filter = doc! { "meal_time": { "$gte": from_date, "$lte": to_date } };

    let mut cursor = feeding_records.find(filter, None).await?;

    let mut csv = String::from("id,rodent_id,food_type,quantity_grams,meal_time,consumed_fully,recorded_by_name\n");

    while let Some(doc) = cursor.try_next().await? {
        let id = doc.get_object_id("_id").map(|id| id.to_hex()).unwrap_or_default();
        let rodent_id = doc.get_object_id("rodent_id").map(|id| id.to_hex()).unwrap_or_default();
        let food_type = doc.get_str("food_type").unwrap_or("");
        let quantity_grams = doc.get_f64("quantity_grams").unwrap_or(0.0);
        let meal_time = doc.get_datetime("meal_time")
            .map(|dt| dt.to_chrono().format("%Y-%m-%d %H:%M:%S").to_string())
            .unwrap_or_default();
        let consumed_fully = doc.get_bool("consumed_fully").unwrap_or(false);
        let recorded_by_name = doc.get_str("recorded_by_name").unwrap_or("");

        csv.push_str(&format!("{},{},{},{},{},{},{}\n", id, rodent_id, food_type, quantity_grams, meal_time, consumed_fully, recorded_by_name));
    }

    Ok(csv)
}

// ============== Health Check ==============

pub async fn health_check() -> Json<MessageResponse> {
    Json(MessageResponse {
        success: true,
        message: "Analytics Service is healthy".to_string(),
    })
}
