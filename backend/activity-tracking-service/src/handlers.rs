use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap},
    Json,
};
use bson::{doc, oid::ObjectId, Document};
use chrono::{Utc, Datelike, TimeZone};
use futures::TryStreamExt;
use jsonwebtoken::{decode, DecodingKey, Validation};
use mongodb::options::FindOptions;
use std::sync::Arc;
use validator::Validate;

use crate::{
    error::AppError,
    middleware::{can_track_activities, can_view},
    models::*,
    AppState,
};

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

// ============== Health Check ==============

pub async fn health_check() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "success": true,
        "service": "activity-tracking-service",
        "status": "healthy"
    }))
}

// ============== Daily Records ==============

pub async fn list_daily_records(
    State(state): State<Arc<AppState>>,
    Path(rodent_id): Path<String>,
    headers: HeaderMap,
    Query(params): Query<DailyRecordQueryParams>,
) -> Result<Json<DailyRecordListResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_view(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    let collection = state.db.db.collection::<DailyRecord>("daily_records");

    let mut filter = doc! { "rodent_id": rodent_oid };

    if let Some(from_date) = params.from_date {
        filter.insert("date", doc! { "$gte": bson::DateTime::from_chrono(from_date) });
    }
    if let Some(to_date) = params.to_date {
        if let Some(date_filter) = filter.get_mut("date") {
            if let Some(doc) = date_filter.as_document_mut() {
                doc.insert("$lte", bson::DateTime::from_chrono(to_date));
            }
        } else {
            filter.insert("date", doc! { "$lte": bson::DateTime::from_chrono(to_date) });
        }
    }

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(30).min(100);

    let total = collection.count_documents(filter.clone(), None).await?;

    let find_options = FindOptions::builder()
        .skip(((page - 1) * limit) as u64)
        .limit(limit as i64)
        .sort(doc! { "date": -1 })
        .build();

    let cursor = collection.find(filter, find_options).await?;
    let records: Vec<DailyRecord> = cursor.try_collect().await?;

    let daily_records: Vec<DailyRecordResponse> = records.into_iter().map(|r| r.into()).collect();

    Ok(Json(DailyRecordListResponse {
        success: true,
        daily_records,
        total,
        page,
        limit,
    }))
}

pub async fn get_daily_record(
    State(state): State<Arc<AppState>>,
    Path((rodent_id, record_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<SingleDailyRecordResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_view(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let record_oid = ObjectId::parse_str(&record_id).map_err(|_| AppError::InvalidId)?;

    let collection = state.db.db.collection::<DailyRecord>("daily_records");

    let record = collection
        .find_one(doc! { "_id": record_oid, "rodent_id": rodent_oid }, None)
        .await?
        .ok_or(AppError::DailyRecordNotFound)?;

    Ok(Json(SingleDailyRecordResponse {
        success: true,
        daily_record: record.into(),
    }))
}

pub async fn create_daily_record(
    State(state): State<Arc<AppState>>,
    Path(rodent_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateDailyRecordRequest>,
) -> Result<Json<SingleDailyRecordResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_track_activities(&auth_info)?;

    payload.validate()?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    let now = Utc::now();
    let date = payload.date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap().and_utc())
        .unwrap_or(now);

    let record = DailyRecord {
        id: None,
        rodent_id: rodent_oid,
        date,
        weight_grams: payload.weight_grams,
        temperature_celsius: payload.temperature_celsius,
        energy_level: payload.energy_level,
        mood_level: payload.mood_level,
        behavior_notes: payload.behavior_notes,
        health_observations: payload.health_observations,
        created_by: auth_info.user_id.clone(),
        created_by_name: auth_info.username.clone(),
        created_at: now,
        updated_at: now,
    };

    let collection = state.db.db.collection::<DailyRecord>("daily_records");
    let result = collection.insert_one(&record, None).await?;

    let inserted_id = result.inserted_id.as_object_id().ok_or(AppError::InternalError)?;
    let mut created_record = record;
    created_record.id = Some(inserted_id);

    Ok(Json(SingleDailyRecordResponse {
        success: true,
        daily_record: created_record.into(),
    }))
}

pub async fn update_daily_record(
    State(state): State<Arc<AppState>>,
    Path((rodent_id, record_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<UpdateDailyRecordRequest>,
) -> Result<Json<SingleDailyRecordResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_track_activities(&auth_info)?;

    payload.validate()?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let record_oid = ObjectId::parse_str(&record_id).map_err(|_| AppError::InvalidId)?;

    let collection = state.db.db.collection::<DailyRecord>("daily_records");

    // Build update document
    let mut update_doc = Document::new();
    if let Some(weight) = payload.weight_grams {
        update_doc.insert("weight_grams", weight);
    }
    if let Some(temp) = payload.temperature_celsius {
        update_doc.insert("temperature_celsius", temp);
    }
    if let Some(energy) = payload.energy_level {
        update_doc.insert("energy_level", energy);
    }
    if let Some(mood) = payload.mood_level {
        update_doc.insert("mood_level", mood);
    }
    if let Some(notes) = payload.behavior_notes {
        update_doc.insert("behavior_notes", notes);
    }
    if let Some(health) = payload.health_observations {
        update_doc.insert("health_observations", health);
    }
    update_doc.insert("updated_at", bson::DateTime::from_chrono(Utc::now()));

    collection
        .update_one(
            doc! { "_id": record_oid, "rodent_id": rodent_oid },
            doc! { "$set": update_doc },
            None,
        )
        .await?;

    let updated_record = collection
        .find_one(doc! { "_id": record_oid }, None)
        .await?
        .ok_or(AppError::DailyRecordNotFound)?;

    Ok(Json(SingleDailyRecordResponse {
        success: true,
        daily_record: updated_record.into(),
    }))
}

pub async fn delete_daily_record(
    State(state): State<Arc<AppState>>,
    Path((rodent_id, record_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<MessageResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_track_activities(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let record_oid = ObjectId::parse_str(&record_id).map_err(|_| AppError::InvalidId)?;

    let collection = state.db.db.collection::<DailyRecord>("daily_records");

    let result = collection
        .delete_one(doc! { "_id": record_oid, "rodent_id": rodent_oid }, None)
        .await?;

    if result.deleted_count == 0 {
        return Err(AppError::DailyRecordNotFound);
    }

    Ok(Json(MessageResponse {
        success: true,
        message: "Daily record deleted successfully".to_string(),
    }))
}

// ============== Activities ==============

pub async fn list_activities(
    State(state): State<Arc<AppState>>,
    Path(rodent_id): Path<String>,
    headers: HeaderMap,
    Query(params): Query<ActivityQueryParams>,
) -> Result<Json<ActivityListResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_view(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    let collection = state.db.db.collection::<Activity>("activities");

    let mut filter = doc! { "rodent_id": rodent_oid };

    if let Some(activity_type) = params.activity_type {
        filter.insert("activity_type", activity_type.as_str());
    }
    if let Some(from_date) = params.from_date {
        filter.insert("recorded_at", doc! { "$gte": bson::DateTime::from_chrono(from_date) });
    }
    if let Some(to_date) = params.to_date {
        if let Some(date_filter) = filter.get_mut("recorded_at") {
            if let Some(doc) = date_filter.as_document_mut() {
                doc.insert("$lte", bson::DateTime::from_chrono(to_date));
            }
        } else {
            filter.insert("recorded_at", doc! { "$lte": bson::DateTime::from_chrono(to_date) });
        }
    }

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(30).min(100);

    let total = collection.count_documents(filter.clone(), None).await?;

    let find_options = FindOptions::builder()
        .skip(((page - 1) * limit) as u64)
        .limit(limit as i64)
        .sort(doc! { "recorded_at": -1 })
        .build();

    let cursor = collection.find(filter, find_options).await?;
    let records: Vec<Activity> = cursor.try_collect().await?;

    let activities: Vec<ActivityResponse> = records.into_iter().map(|r| r.into()).collect();

    Ok(Json(ActivityListResponse {
        success: true,
        activities,
        total,
        page,
        limit,
    }))
}

pub async fn create_activity(
    State(state): State<Arc<AppState>>,
    Path(rodent_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateActivityRequest>,
) -> Result<Json<SingleActivityResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_track_activities(&auth_info)?;

    payload.validate()?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    let now = Utc::now();

    let activity = Activity {
        id: None,
        rodent_id: rodent_oid,
        activity_type: payload.activity_type,
        duration_minutes: payload.duration_minutes,
        notes: payload.notes,
        recorded_at: payload.recorded_at.unwrap_or(now),
        recorded_by: auth_info.user_id.clone(),
        recorded_by_name: auth_info.username.clone(),
        created_at: now,
    };

    let collection = state.db.db.collection::<Activity>("activities");
    let result = collection.insert_one(&activity, None).await?;

    let inserted_id = result.inserted_id.as_object_id().ok_or(AppError::InternalError)?;
    let mut created_activity = activity;
    created_activity.id = Some(inserted_id);

    Ok(Json(SingleActivityResponse {
        success: true,
        activity: created_activity.into(),
    }))
}

pub async fn delete_activity(
    State(state): State<Arc<AppState>>,
    Path((rodent_id, activity_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<MessageResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_track_activities(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let activity_oid = ObjectId::parse_str(&activity_id).map_err(|_| AppError::InvalidId)?;

    let collection = state.db.db.collection::<Activity>("activities");

    let result = collection
        .delete_one(doc! { "_id": activity_oid, "rodent_id": rodent_oid }, None)
        .await?;

    if result.deleted_count == 0 {
        return Err(AppError::ActivityNotFound);
    }

    Ok(Json(MessageResponse {
        success: true,
        message: "Activity deleted successfully".to_string(),
    }))
}

// ============== Feeding Records ==============

pub async fn list_feeding_records(
    State(state): State<Arc<AppState>>,
    Path(rodent_id): Path<String>,
    headers: HeaderMap,
    Query(params): Query<FeedingQueryParams>,
) -> Result<Json<FeedingRecordListResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_view(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    let collection = state.db.db.collection::<FeedingRecord>("feeding_records");

    let mut filter = doc! { "rodent_id": rodent_oid };

    if let Some(food_type) = params.food_type {
        filter.insert("food_type", food_type.as_str());
    }
    if let Some(from_date) = params.from_date {
        filter.insert("meal_time", doc! { "$gte": bson::DateTime::from_chrono(from_date) });
    }
    if let Some(to_date) = params.to_date {
        if let Some(date_filter) = filter.get_mut("meal_time") {
            if let Some(doc) = date_filter.as_document_mut() {
                doc.insert("$lte", bson::DateTime::from_chrono(to_date));
            }
        } else {
            filter.insert("meal_time", doc! { "$lte": bson::DateTime::from_chrono(to_date) });
        }
    }

    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(30).min(100);

    let total = collection.count_documents(filter.clone(), None).await?;

    let find_options = FindOptions::builder()
        .skip(((page - 1) * limit) as u64)
        .limit(limit as i64)
        .sort(doc! { "meal_time": -1 })
        .build();

    let cursor = collection.find(filter, find_options).await?;
    let records: Vec<FeedingRecord> = cursor.try_collect().await?;

    let feeding_records: Vec<FeedingRecordResponse> = records.into_iter().map(|r| r.into()).collect();

    Ok(Json(FeedingRecordListResponse {
        success: true,
        feeding_records,
        total,
        page,
        limit,
    }))
}

pub async fn create_feeding_record(
    State(state): State<Arc<AppState>>,
    Path(rodent_id): Path<String>,
    headers: HeaderMap,
    Json(payload): Json<CreateFeedingRecordRequest>,
) -> Result<Json<SingleFeedingRecordResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_track_activities(&auth_info)?;

    payload.validate()?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    let now = Utc::now();

    let record = FeedingRecord {
        id: None,
        rodent_id: rodent_oid,
        food_type: payload.food_type,
        quantity_grams: payload.quantity_grams,
        meal_time: payload.meal_time.unwrap_or(now),
        notes: payload.notes,
        consumed_fully: payload.consumed_fully,
        recorded_by: auth_info.user_id.clone(),
        recorded_by_name: auth_info.username.clone(),
        created_at: now,
    };

    let collection = state.db.db.collection::<FeedingRecord>("feeding_records");
    let result = collection.insert_one(&record, None).await?;

    let inserted_id = result.inserted_id.as_object_id().ok_or(AppError::InternalError)?;
    let mut created_record = record;
    created_record.id = Some(inserted_id);

    Ok(Json(SingleFeedingRecordResponse {
        success: true,
        feeding_record: created_record.into(),
    }))
}

pub async fn update_feeding_record(
    State(state): State<Arc<AppState>>,
    Path((rodent_id, record_id)): Path<(String, String)>,
    headers: HeaderMap,
    Json(payload): Json<UpdateFeedingRecordRequest>,
) -> Result<Json<SingleFeedingRecordResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_track_activities(&auth_info)?;

    payload.validate()?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let record_oid = ObjectId::parse_str(&record_id).map_err(|_| AppError::InvalidId)?;

    let collection = state.db.db.collection::<FeedingRecord>("feeding_records");

    let mut update_doc = Document::new();
    if let Some(food_type) = payload.food_type {
        update_doc.insert("food_type", food_type.as_str());
    }
    if let Some(quantity) = payload.quantity_grams {
        update_doc.insert("quantity_grams", quantity);
    }
    if let Some(meal_time) = payload.meal_time {
        update_doc.insert("meal_time", bson::DateTime::from_chrono(meal_time));
    }
    if let Some(notes) = payload.notes {
        update_doc.insert("notes", notes);
    }
    if let Some(consumed) = payload.consumed_fully {
        update_doc.insert("consumed_fully", consumed);
    }

    collection
        .update_one(
            doc! { "_id": record_oid, "rodent_id": rodent_oid },
            doc! { "$set": update_doc },
            None,
        )
        .await?;

    let updated_record = collection
        .find_one(doc! { "_id": record_oid }, None)
        .await?
        .ok_or(AppError::FeedingRecordNotFound)?;

    Ok(Json(SingleFeedingRecordResponse {
        success: true,
        feeding_record: updated_record.into(),
    }))
}

pub async fn delete_feeding_record(
    State(state): State<Arc<AppState>>,
    Path((rodent_id, record_id)): Path<(String, String)>,
    headers: HeaderMap,
) -> Result<Json<MessageResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_track_activities(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let record_oid = ObjectId::parse_str(&record_id).map_err(|_| AppError::InvalidId)?;

    let collection = state.db.db.collection::<FeedingRecord>("feeding_records");

    let result = collection
        .delete_one(doc! { "_id": record_oid, "rodent_id": rodent_oid }, None)
        .await?;

    if result.deleted_count == 0 {
        return Err(AppError::FeedingRecordNotFound);
    }

    Ok(Json(MessageResponse {
        success: true,
        message: "Feeding record deleted successfully".to_string(),
    }))
}

// ============== Daily Summary ==============

pub async fn get_daily_summary(
    State(state): State<Arc<AppState>>,
    Path((rodent_id, date_str)): Path<(String, String)>,
    Query(params): Query<DailySummaryQueryParams>,
    headers: HeaderMap,
) -> Result<Json<DailySummaryResponse>, AppError> {
    let auth_info = extract_auth_info(&state, &headers)?;
    can_view(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    // Parse date from string (format: YYYY-MM-DD)
    let date = chrono::NaiveDate::parse_from_str(&date_str, "%Y-%m-%d")
        .map_err(|_| AppError::ValidationError("Invalid date format. Use YYYY-MM-DD".to_string()))?;

    // Calculate the start and end of day in UTC, accounting for timezone offset
    // JavaScript's getTimezoneOffset() returns minutes: positive for west of UTC, negative for east
    // For UTC+1, offset is -60, so local midnight = UTC midnight + 60 minutes = 01:00 UTC previous day
    // To get UTC time from local time: UTC = local + offset
    // So for local midnight at UTC+1: UTC = 00:00 + (-60min) = 23:00 previous day UTC
    let tz_offset_minutes = params.tz_offset.unwrap_or(0);
    let offset_duration = chrono::Duration::minutes(tz_offset_minutes as i64);
    
    let local_start = date.and_hms_opt(0, 0, 0).unwrap();
    let local_end = date.and_hms_opt(23, 59, 59).unwrap();
    
    // Convert local time to UTC by adding the offset
    let start_of_day = Utc.from_utc_datetime(&local_start) + offset_duration;
    let end_of_day = Utc.from_utc_datetime(&local_end) + offset_duration;

    // Get daily record
    let daily_collection = state.db.db.collection::<DailyRecord>("daily_records");
    let daily_record = daily_collection
        .find_one(
            doc! {
                "rodent_id": rodent_oid,
                "date": {
                    "$gte": bson::DateTime::from_chrono(start_of_day),
                    "$lte": bson::DateTime::from_chrono(end_of_day)
                }
            },
            None,
        )
        .await?;

    // Get activities for the day
    let activities_collection = state.db.db.collection::<Activity>("activities");
    let cursor = activities_collection
        .find(
            doc! {
                "rodent_id": rodent_oid,
                "recorded_at": {
                    "$gte": bson::DateTime::from_chrono(start_of_day),
                    "$lte": bson::DateTime::from_chrono(end_of_day)
                }
            },
            None,
        )
        .await?;
    let activities: Vec<Activity> = cursor.try_collect().await?;

    // Get feeding records for the day
    let feeding_collection = state.db.db.collection::<FeedingRecord>("feeding_records");
    let cursor = feeding_collection
        .find(
            doc! {
                "rodent_id": rodent_oid,
                "meal_time": {
                    "$gte": bson::DateTime::from_chrono(start_of_day),
                    "$lte": bson::DateTime::from_chrono(end_of_day)
                }
            },
            None,
        )
        .await?;
    let feeding_records: Vec<FeedingRecord> = cursor.try_collect().await?;

    // Calculate totals
    let total_activity_minutes: i32 = activities.iter().map(|a| a.duration_minutes).sum();
    let total_food_grams: f64 = feeding_records.iter().map(|f| f.quantity_grams).sum();

    Ok(Json(DailySummaryResponse {
        success: true,
        rodent_id: rodent_id.clone(),
        date: start_of_day,
        daily_record: daily_record.map(|r| r.into()),
        activities: activities.into_iter().map(|a| a.into()).collect(),
        feeding_records: feeding_records.into_iter().map(|f| f.into()).collect(),
        total_activity_minutes,
        total_food_grams,
    }))
}
