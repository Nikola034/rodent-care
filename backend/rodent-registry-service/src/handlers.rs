use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    Extension, Json,
};
use base64::Engine;
use bson::{doc, oid::ObjectId, Document};
use chrono::Utc;
use futures::TryStreamExt;
use mongodb::options::FindOptions;
use std::sync::Arc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    middleware::{can_manage_medical_records, can_manage_rodents, can_view},
    models::*,
    AppState,
};

// ============== Health Check ==============

pub async fn health_check() -> Json<MessageResponse> {
    Json(MessageResponse {
        success: true,
        message: "Rodent Registry Service is healthy".to_string(),
    })
}

// ============== Rodent Handlers ==============

/// List all rodents with filtering and pagination
pub async fn list_rodents(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Query(params): Query<RodentQueryParams>,
) -> Result<Json<RodentListResponse>, AppError> {
    can_view(&auth_info)?;

    let collection = state.db.db.collection::<Rodent>("rodents");

    // Build filter
    let mut filter = Document::new();

    if let Some(species) = &params.species {
        filter.insert("species", species.as_str());
    }

    if let Some(status) = &params.status {
        filter.insert("status", status.as_str());
    }

    if let Some(name) = &params.name {
        // Case-insensitive partial match
        filter.insert("name", doc! { "$regex": name, "$options": "i" });
    }

    if let Some(chip_id) = &params.chip_id {
        filter.insert("chip_id", chip_id);
    }

    // Pagination
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = (page - 1) * limit;

    // Sorting
    let sort_field = match params.sort_by.as_deref() {
        Some("age") => "date_of_birth",
        Some("intake_date") => "intake_date",
        Some("name") => "name",
        _ => "created_at",
    };
    let sort_order = if params.sort_order.as_deref() == Some("asc") { 1 } else { -1 };

    let find_options = FindOptions::builder()
        .skip(Some(skip as u64))
        .limit(Some(limit as i64))
        .sort(doc! { sort_field: sort_order })
        .build();

    // Get total count
    let total = collection.count_documents(filter.clone(), None).await?;

    // Get rodents
    let mut cursor = collection.find(filter, find_options).await?;
    let mut rodents = Vec::new();

    while let Some(rodent) = cursor.try_next().await? {
        rodents.push(RodentResponse::from(rodent));
    }

    Ok(Json(RodentListResponse {
        success: true,
        rodents,
        total,
        page,
        limit,
    }))
}

/// Get a single rodent by ID
pub async fn get_rodent(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path(id): Path<String>,
) -> Result<Json<SingleRodentResponse>, AppError> {
    can_view(&auth_info)?;

    let object_id = ObjectId::parse_str(&id).map_err(|_| AppError::InvalidRodentId)?;
    let collection = state.db.db.collection::<Rodent>("rodents");

    let rodent = collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::RodentNotFound)?;

    Ok(Json(SingleRodentResponse {
        success: true,
        rodent: RodentResponse::from(rodent),
    }))
}

/// Create a new rodent
pub async fn create_rodent(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Json(payload): Json<CreateRodentRequest>,
) -> Result<(StatusCode, Json<SingleRodentResponse>), AppError> {
    can_manage_rodents(&auth_info)?;
    payload.validate()?;

    let now = Utc::now();
    let collection = state.db.db.collection::<Rodent>("rodents");

    let rodent = Rodent {
        id: None,
        species: payload.species,
        name: payload.name,
        gender: payload.gender,
        date_of_birth: payload.date_of_birth,
        date_of_birth_estimated: payload.date_of_birth_estimated,
        chip_id: payload.chip_id,
        status: payload.status,
        notes: payload.notes,
        images: Vec::new(),
        intake_date: payload.intake_date.unwrap_or(now),
        created_at: now,
        updated_at: now,
        created_by: auth_info.user_id.clone(),
        updated_by: auth_info.user_id,
    };

    let result = collection.insert_one(&rodent, None).await?;
    let inserted_id = result.inserted_id.as_object_id().ok_or(AppError::InternalError)?;

    // Fetch the created rodent
    let created_rodent = collection
        .find_one(doc! { "_id": inserted_id }, None)
        .await?
        .ok_or(AppError::InternalError)?;

    Ok((
        StatusCode::CREATED,
        Json(SingleRodentResponse {
            success: true,
            rodent: RodentResponse::from(created_rodent),
        }),
    ))
}

/// Update a rodent
pub async fn update_rodent(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateRodentRequest>,
) -> Result<Json<SingleRodentResponse>, AppError> {
    can_manage_rodents(&auth_info)?;
    payload.validate()?;

    let object_id = ObjectId::parse_str(&id).map_err(|_| AppError::InvalidRodentId)?;
    let collection = state.db.db.collection::<Rodent>("rodents");

    // Check if rodent exists
    let existing = collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::RodentNotFound)?;

    // Build update document
    let mut update_doc = doc! {
        "updated_at": Utc::now(),
        "updated_by": &auth_info.user_id,
    };

    if let Some(species) = &payload.species {
        update_doc.insert("species", species.as_str());
    }
    if let Some(name) = &payload.name {
        update_doc.insert("name", name);
    }
    if let Some(gender) = &payload.gender {
        update_doc.insert("gender", bson::to_bson(gender).map_err(|_| AppError::InternalError)?);
    }
    if let Some(date_of_birth) = payload.date_of_birth {
        update_doc.insert("date_of_birth", date_of_birth);
    }
    if let Some(estimated) = payload.date_of_birth_estimated {
        update_doc.insert("date_of_birth_estimated", estimated);
    }
    if payload.chip_id.is_some() || existing.chip_id.is_some() {
        update_doc.insert("chip_id", &payload.chip_id);
    }
    if payload.notes.is_some() || existing.notes.is_some() {
        update_doc.insert("notes", &payload.notes);
    }

    collection
        .update_one(doc! { "_id": object_id }, doc! { "$set": update_doc }, None)
        .await?;

    // Fetch updated rodent
    let updated_rodent = collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::InternalError)?;

    Ok(Json(SingleRodentResponse {
        success: true,
        rodent: RodentResponse::from(updated_rodent),
    }))
}

/// Update rodent status
pub async fn update_rodent_status(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateRodentStatusRequest>,
) -> Result<Json<SingleRodentResponse>, AppError> {
    can_manage_rodents(&auth_info)?;
    payload.validate()?;

    let object_id = ObjectId::parse_str(&id).map_err(|_| AppError::InvalidRodentId)?;
    let rodent_collection = state.db.db.collection::<Rodent>("rodents");
    let history_collection = state.db.db.collection::<StatusHistory>("status_history");

    // Get current rodent
    let rodent = rodent_collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::RodentNotFound)?;

    let old_status = rodent.status.clone();
    let now = Utc::now();

    // Record status change in history
    let history = StatusHistory {
        id: None,
        rodent_id: object_id,
        old_status,
        new_status: payload.status.clone(),
        reason: payload.reason,
        changed_by: auth_info.user_id.clone(),
        changed_by_name: auth_info.username.clone(),
        changed_at: now,
    };

    history_collection.insert_one(&history, None).await?;

    // Update rodent status
    rodent_collection
        .update_one(
            doc! { "_id": object_id },
            doc! {
                "$set": {
                    "status": payload.status.as_str(),
                    "updated_at": now,
                    "updated_by": &auth_info.user_id,
                }
            },
            None,
        )
        .await?;

    // Fetch updated rodent
    let updated_rodent = rodent_collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::InternalError)?;

    Ok(Json(SingleRodentResponse {
        success: true,
        rodent: RodentResponse::from(updated_rodent),
    }))
}

/// Delete a rodent
pub async fn delete_rodent(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path(id): Path<String>,
) -> Result<Json<MessageResponse>, AppError> {
    can_manage_rodents(&auth_info)?;

    let object_id = ObjectId::parse_str(&id).map_err(|_| AppError::InvalidRodentId)?;
    let collection = state.db.db.collection::<Rodent>("rodents");

    let result = collection.delete_one(doc! { "_id": object_id }, None).await?;

    if result.deleted_count == 0 {
        return Err(AppError::RodentNotFound);
    }

    // Also delete related medical records and status history
    let medical_collection = state.db.db.collection::<MedicalRecord>("medical_records");
    let history_collection = state.db.db.collection::<StatusHistory>("status_history");

    medical_collection
        .delete_many(doc! { "rodent_id": object_id }, None)
        .await?;
    history_collection
        .delete_many(doc! { "rodent_id": object_id }, None)
        .await?;

    tracing::info!(
        "Rodent {} deleted by user {}",
        id,
        auth_info.username
    );

    Ok(Json(MessageResponse {
        success: true,
        message: "Rodent deleted successfully".to_string(),
    }))
}

/// Get rodent status history
pub async fn get_rodent_status_history(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path(id): Path<String>,
) -> Result<Json<StatusHistoryListResponse>, AppError> {
    can_view(&auth_info)?;

    let object_id = ObjectId::parse_str(&id).map_err(|_| AppError::InvalidRodentId)?;

    // Verify rodent exists
    let rodent_collection = state.db.db.collection::<Rodent>("rodents");
    rodent_collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::RodentNotFound)?;

    let collection = state.db.db.collection::<StatusHistory>("status_history");

    let find_options = FindOptions::builder()
        .sort(doc! { "changed_at": -1 })
        .build();

    let mut cursor = collection
        .find(doc! { "rodent_id": object_id }, find_options)
        .await?;

    let mut history = Vec::new();
    while let Some(record) = cursor.try_next().await? {
        history.push(StatusHistoryResponse::from(record));
    }

    Ok(Json(StatusHistoryListResponse {
        success: true,
        history,
    }))
}

// ============== Image Handlers ==============

/// Upload an image for a rodent
pub async fn upload_rodent_image(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path(id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<ImageUploadResponse>, AppError> {
    can_manage_rodents(&auth_info)?;

    let object_id = ObjectId::parse_str(&id).map_err(|_| AppError::InvalidRodentId)?;
    let collection = state.db.db.collection::<Rodent>("rodents");

    // Verify rodent exists
    let rodent = collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::RodentNotFound)?;

    let max_size = state.config.max_image_size_mb * 1024 * 1024;
    let mut image_data: Option<(String, String, Vec<u8>)> = None;
    let mut is_primary = rodent.images.is_empty(); // First image is primary by default

    while let Some(field) = multipart.next_field().await.map_err(|e| {
        AppError::ValidationError(format!("Failed to read multipart field: {}", e))
    })? {
        let name = field.name().unwrap_or("").to_string();

        if name == "image" {
            let filename = field
                .file_name()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "image.jpg".to_string());

            let content_type = field
                .content_type()
                .map(|s| s.to_string())
                .unwrap_or_else(|| "image/jpeg".to_string());

            // Validate content type
            let valid_types = ["image/jpeg", "image/png", "image/gif", "image/webp"];
            if !valid_types.contains(&content_type.as_str()) {
                return Err(AppError::InvalidImageFormat(format!(
                    "Supported formats: {}",
                    valid_types.join(", ")
                )));
            }

            let data = field.bytes().await.map_err(|e| {
                AppError::ValidationError(format!("Failed to read image data: {}", e))
            })?;

            if data.len() > max_size {
                return Err(AppError::ImageTooLarge(state.config.max_image_size_mb));
            }

            image_data = Some((filename, content_type, data.to_vec()));
        } else if name == "is_primary" {
            let value = field.text().await.unwrap_or_default();
            is_primary = value == "true" || value == "1";
        }
    }

    let (filename, content_type, data) = image_data
        .ok_or_else(|| AppError::ValidationError("No image provided".to_string()))?;

    let image_id = Uuid::new_v4().to_string();
    let base64_data = base64::engine::general_purpose::STANDARD.encode(&data);

    let new_image = RodentImage {
        id: image_id.clone(),
        filename,
        content_type,
        data: base64_data,
        uploaded_at: Utc::now(),
        is_primary,
    };

    // If this is set as primary, unset previous primary
    if is_primary {
        collection
            .update_one(
                doc! { "_id": object_id },
                doc! { "$set": { "images.$[].is_primary": false } },
                None,
            )
            .await?;
    }

    // Add new image
    collection
        .update_one(
            doc! { "_id": object_id },
            doc! {
                "$push": { "images": bson::to_bson(&new_image).map_err(|_| AppError::InternalError)? },
                "$set": { "updated_at": Utc::now(), "updated_by": &auth_info.user_id }
            },
            None,
        )
        .await?;

    Ok(Json(ImageUploadResponse {
        success: true,
        message: "Image uploaded successfully".to_string(),
        image_id,
    }))
}

/// Delete a rodent image
pub async fn delete_rodent_image(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path((rodent_id, image_id)): Path<(String, String)>,
) -> Result<Json<MessageResponse>, AppError> {
    can_manage_rodents(&auth_info)?;

    let object_id = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let collection = state.db.db.collection::<Rodent>("rodents");

    let result = collection
        .update_one(
            doc! { "_id": object_id },
            doc! {
                "$pull": { "images": { "id": &image_id } },
                "$set": { "updated_at": Utc::now(), "updated_by": &auth_info.user_id }
            },
            None,
        )
        .await?;

    if result.modified_count == 0 {
        return Err(AppError::RodentNotFound);
    }

    Ok(Json(MessageResponse {
        success: true,
        message: "Image deleted successfully".to_string(),
    }))
}

/// Set an image as primary
pub async fn set_primary_image(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path((rodent_id, image_id)): Path<(String, String)>,
) -> Result<Json<MessageResponse>, AppError> {
    can_manage_rodents(&auth_info)?;

    let object_id = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let collection = state.db.db.collection::<Rodent>("rodents");

    // First, unset all primary flags
    collection
        .update_one(
            doc! { "_id": object_id },
            doc! { "$set": { "images.$[].is_primary": false } },
            None,
        )
        .await?;

    // Then set the specified image as primary
    let result = collection
        .update_one(
            doc! { "_id": object_id, "images.id": &image_id },
            doc! {
                "$set": {
                    "images.$.is_primary": true,
                    "updated_at": Utc::now(),
                    "updated_by": &auth_info.user_id
                }
            },
            None,
        )
        .await?;

    if result.modified_count == 0 {
        return Err(AppError::RodentNotFound);
    }

    Ok(Json(MessageResponse {
        success: true,
        message: "Primary image updated successfully".to_string(),
    }))
}

// ============== Medical Record Handlers ==============

/// List medical records for a rodent
pub async fn list_medical_records(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path(rodent_id): Path<String>,
    Query(params): Query<MedicalRecordQueryParams>,
) -> Result<Json<MedicalRecordListResponse>, AppError> {
    can_view(&auth_info)?;

    let object_id = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    // Verify rodent exists
    let rodent_collection = state.db.db.collection::<Rodent>("rodents");
    rodent_collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::RodentNotFound)?;

    let collection = state.db.db.collection::<MedicalRecord>("medical_records");

    // Build filter
    let mut filter = doc! { "rodent_id": object_id };

    if let Some(record_type) = &params.record_type {
        filter.insert("record_type", record_type.as_str());
    }

    if let Some(from_date) = params.from_date {
        filter.insert("date", doc! { "$gte": from_date });
    }

    if let Some(to_date) = params.to_date {
        if filter.contains_key("date") {
            let existing = filter.get_document_mut("date").unwrap();
            existing.insert("$lte", to_date);
        } else {
            filter.insert("date", doc! { "$lte": to_date });
        }
    }

    // Pagination
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).min(100);
    let skip = (page - 1) * limit;

    let find_options = FindOptions::builder()
        .skip(Some(skip as u64))
        .limit(Some(limit as i64))
        .sort(doc! { "date": -1 })
        .build();

    let total = collection.count_documents(filter.clone(), None).await?;

    let mut cursor = collection.find(filter, find_options).await?;
    let mut records = Vec::new();

    while let Some(record) = cursor.try_next().await? {
        records.push(MedicalRecordResponse::from(record));
    }

    Ok(Json(MedicalRecordListResponse {
        success: true,
        medical_records: records,
        total,
        page,
        limit,
    }))
}

/// Get a single medical record
pub async fn get_medical_record(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path((rodent_id, record_id)): Path<(String, String)>,
) -> Result<Json<SingleMedicalRecordResponse>, AppError> {
    can_view(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let record_oid = ObjectId::parse_str(&record_id).map_err(|_| AppError::InvalidMedicalRecordId)?;

    let collection = state.db.db.collection::<MedicalRecord>("medical_records");

    let record = collection
        .find_one(doc! { "_id": record_oid, "rodent_id": rodent_oid }, None)
        .await?
        .ok_or(AppError::MedicalRecordNotFound)?;

    Ok(Json(SingleMedicalRecordResponse {
        success: true,
        medical_record: MedicalRecordResponse::from(record),
    }))
}

/// Create a medical record
pub async fn create_medical_record(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path(rodent_id): Path<String>,
    Json(payload): Json<CreateMedicalRecordRequest>,
) -> Result<(StatusCode, Json<SingleMedicalRecordResponse>), AppError> {
    can_manage_medical_records(&auth_info)?;
    payload.validate()?;

    let object_id = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;

    // Verify rodent exists
    let rodent_collection = state.db.db.collection::<Rodent>("rodents");
    rodent_collection
        .find_one(doc! { "_id": object_id }, None)
        .await?
        .ok_or(AppError::RodentNotFound)?;

    let collection = state.db.db.collection::<MedicalRecord>("medical_records");
    let now = Utc::now();

    let record = MedicalRecord {
        id: None,
        rodent_id: object_id,
        record_type: payload.record_type,
        date: payload.date.unwrap_or(now),
        description: payload.description,
        diagnosis: payload.diagnosis,
        medications: payload.medications.into_iter().map(Medication::from).collect(),
        test_results: payload.test_results,
        next_appointment: payload.next_appointment,
        veterinarian_id: auth_info.user_id.clone(),
        veterinarian_name: auth_info.username.clone(),
        created_at: now,
        updated_at: now,
    };

    let result = collection.insert_one(&record, None).await?;
    let inserted_id = result.inserted_id.as_object_id().ok_or(AppError::InternalError)?;

    let created_record = collection
        .find_one(doc! { "_id": inserted_id }, None)
        .await?
        .ok_or(AppError::InternalError)?;

    Ok((
        StatusCode::CREATED,
        Json(SingleMedicalRecordResponse {
            success: true,
            medical_record: MedicalRecordResponse::from(created_record),
        }),
    ))
}

/// Update a medical record
pub async fn update_medical_record(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path((rodent_id, record_id)): Path<(String, String)>,
    Json(payload): Json<UpdateMedicalRecordRequest>,
) -> Result<Json<SingleMedicalRecordResponse>, AppError> {
    can_manage_medical_records(&auth_info)?;
    payload.validate()?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let record_oid = ObjectId::parse_str(&record_id).map_err(|_| AppError::InvalidMedicalRecordId)?;

    let collection = state.db.db.collection::<MedicalRecord>("medical_records");

    // Verify record exists
    collection
        .find_one(doc! { "_id": record_oid, "rodent_id": rodent_oid }, None)
        .await?
        .ok_or(AppError::MedicalRecordNotFound)?;

    // Build update document
    let mut update_doc = doc! { "updated_at": Utc::now() };

    if let Some(record_type) = &payload.record_type {
        update_doc.insert("record_type", record_type.as_str());
    }
    if let Some(date) = payload.date {
        update_doc.insert("date", date);
    }
    if let Some(description) = &payload.description {
        update_doc.insert("description", description);
    }
    if let Some(diagnosis) = &payload.diagnosis {
        update_doc.insert("diagnosis", diagnosis);
    }
    if let Some(medications) = payload.medications {
        let meds: Vec<Medication> = medications.into_iter().map(Medication::from).collect();
        update_doc.insert("medications", bson::to_bson(&meds).map_err(|_| AppError::InternalError)?);
    }
    if let Some(test_results) = &payload.test_results {
        update_doc.insert("test_results", test_results);
    }
    if let Some(next_appointment) = payload.next_appointment {
        update_doc.insert("next_appointment", next_appointment);
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
        .ok_or(AppError::InternalError)?;

    Ok(Json(SingleMedicalRecordResponse {
        success: true,
        medical_record: MedicalRecordResponse::from(updated_record),
    }))
}

/// Delete a medical record
pub async fn delete_medical_record(
    State(state): State<Arc<AppState>>,
    Extension(auth_info): Extension<AuthInfo>,
    Path((rodent_id, record_id)): Path<(String, String)>,
) -> Result<Json<MessageResponse>, AppError> {
    can_manage_medical_records(&auth_info)?;

    let rodent_oid = ObjectId::parse_str(&rodent_id).map_err(|_| AppError::InvalidRodentId)?;
    let record_oid = ObjectId::parse_str(&record_id).map_err(|_| AppError::InvalidMedicalRecordId)?;

    let collection = state.db.db.collection::<MedicalRecord>("medical_records");

    let result = collection
        .delete_one(doc! { "_id": record_oid, "rodent_id": rodent_oid }, None)
        .await?;

    if result.deleted_count == 0 {
        return Err(AppError::MedicalRecordNotFound);
    }

    tracing::info!(
        "Medical record {} for rodent {} deleted by user {}",
        record_id,
        rodent_id,
        auth_info.username
    );

    Ok(Json(MessageResponse {
        success: true,
        message: "Medical record deleted successfully".to_string(),
    }))
}
