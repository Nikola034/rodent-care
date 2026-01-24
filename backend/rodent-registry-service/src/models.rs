use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;

// ============== Enums ==============

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Species {
    Beaver,
    Capybara,
    Nutria,
    GuineaPig,
    Muskrat,
    Hamster,
    PrairieDog,
    Rabbit,
}

impl Species {
    pub fn as_str(&self) -> &'static str {
        match self {
            Species::Beaver => "beaver",
            Species::Capybara => "capybara",
            Species::Nutria => "nutria",
            Species::GuineaPig => "guinea_pig",
            Species::Muskrat => "muskrat",
            Species::Hamster => "hamster",
            Species::PrairieDog => "prairie_dog",
            Species::Rabbit => "rabbit",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum Gender {
    Male,
    Female,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RodentStatus {
    Active,
    Adopted,
    Quarantine,
    MedicalCare,
    Deceased,
}

impl RodentStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            RodentStatus::Active => "active",
            RodentStatus::Adopted => "adopted",
            RodentStatus::Quarantine => "quarantine",
            RodentStatus::MedicalCare => "medical_care",
            RodentStatus::Deceased => "deceased",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum MedicalRecordType {
    Vaccination,
    Treatment,
    Diagnosis,
    Surgery,
    CheckUp,
}

impl MedicalRecordType {
    pub fn as_str(&self) -> &'static str {
        match self {
            MedicalRecordType::Vaccination => "vaccination",
            MedicalRecordType::Treatment => "treatment",
            MedicalRecordType::Diagnosis => "diagnosis",
            MedicalRecordType::Surgery => "surgery",
            MedicalRecordType::CheckUp => "check_up",
        }
    }
}

// ============== Database Models ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rodent {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub species: Species,
    pub name: String,
    pub gender: Gender,
    #[serde(default, with = "bson::serde_helpers::chrono_datetime_as_bson_datetime_optional")]
    pub date_of_birth: Option<DateTime<Utc>>,
    pub date_of_birth_estimated: bool,
    pub chip_id: Option<String>,
    pub status: RodentStatus,
    pub notes: Option<String>,
    pub images: Vec<RodentImage>,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub intake_date: DateTime<Utc>,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
    pub updated_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RodentImage {
    pub id: String,
    pub filename: String,
    pub content_type: String,
    pub data: String, // Base64 encoded image data
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub uploaded_at: DateTime<Utc>,
    pub is_primary: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MedicalRecord {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub rodent_id: ObjectId,
    pub record_type: MedicalRecordType,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub date: DateTime<Utc>,
    pub description: String,
    pub diagnosis: Option<String>,
    pub medications: Vec<Medication>,
    pub test_results: Option<String>,
    #[serde(default, with = "bson::serde_helpers::chrono_datetime_as_bson_datetime_optional")]
    pub next_appointment: Option<DateTime<Utc>>,
    pub veterinarian_id: String,
    pub veterinarian_name: String,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Medication {
    pub name: String,
    pub dosage: String,
    pub frequency: String,
    pub duration: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusHistory {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub rodent_id: ObjectId,
    pub old_status: RodentStatus,
    pub new_status: RodentStatus,
    pub reason: Option<String>,
    pub changed_by: String,
    pub changed_by_name: String,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub changed_at: DateTime<Utc>,
}

// ============== Request DTOs ==============

#[derive(Debug, Deserialize, Validate)]
pub struct CreateRodentRequest {
    pub species: Species,
    #[validate(length(min = 1, max = 100, message = "Name must be between 1 and 100 characters"))]
    pub name: String,
    pub gender: Gender,
    pub date_of_birth: Option<DateTime<Utc>>,
    #[serde(default)]
    pub date_of_birth_estimated: bool,
    #[validate(length(max = 50, message = "Chip ID must be at most 50 characters"))]
    pub chip_id: Option<String>,
    pub status: RodentStatus,
    #[validate(length(max = 2000, message = "Notes must be at most 2000 characters"))]
    pub notes: Option<String>,
    pub intake_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateRodentRequest {
    pub species: Option<Species>,
    #[validate(length(min = 1, max = 100, message = "Name must be between 1 and 100 characters"))]
    pub name: Option<String>,
    pub gender: Option<Gender>,
    pub date_of_birth: Option<DateTime<Utc>>,
    pub date_of_birth_estimated: Option<bool>,
    #[validate(length(max = 50, message = "Chip ID must be at most 50 characters"))]
    pub chip_id: Option<String>,
    #[validate(length(max = 2000, message = "Notes must be at most 2000 characters"))]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateRodentStatusRequest {
    pub status: RodentStatus,
    #[validate(length(max = 500, message = "Reason must be at most 500 characters"))]
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateMedicalRecordRequest {
    pub record_type: MedicalRecordType,
    pub date: Option<DateTime<Utc>>,
    #[validate(length(min = 1, max = 5000, message = "Description must be between 1 and 5000 characters"))]
    pub description: String,
    #[validate(length(max = 2000, message = "Diagnosis must be at most 2000 characters"))]
    pub diagnosis: Option<String>,
    #[serde(default)]
    pub medications: Vec<MedicationRequest>,
    #[validate(length(max = 5000, message = "Test results must be at most 5000 characters"))]
    pub test_results: Option<String>,
    pub next_appointment: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct MedicationRequest {
    #[validate(length(min = 1, max = 200, message = "Medication name must be between 1 and 200 characters"))]
    pub name: String,
    #[validate(length(min = 1, max = 100, message = "Dosage must be between 1 and 100 characters"))]
    pub dosage: String,
    #[validate(length(min = 1, max = 100, message = "Frequency must be between 1 and 100 characters"))]
    pub frequency: String,
    #[validate(length(max = 100, message = "Duration must be at most 100 characters"))]
    pub duration: Option<String>,
    #[validate(length(max = 500, message = "Notes must be at most 500 characters"))]
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateMedicalRecordRequest {
    pub record_type: Option<MedicalRecordType>,
    pub date: Option<DateTime<Utc>>,
    #[validate(length(min = 1, max = 5000, message = "Description must be between 1 and 5000 characters"))]
    pub description: Option<String>,
    #[validate(length(max = 2000, message = "Diagnosis must be at most 2000 characters"))]
    pub diagnosis: Option<String>,
    pub medications: Option<Vec<MedicationRequest>>,
    #[validate(length(max = 5000, message = "Test results must be at most 5000 characters"))]
    pub test_results: Option<String>,
    pub next_appointment: Option<DateTime<Utc>>,
}

// Query parameters for listing rodents
#[derive(Debug, Deserialize)]
pub struct RodentQueryParams {
    pub species: Option<Species>,
    pub status: Option<RodentStatus>,
    pub name: Option<String>,
    pub chip_id: Option<String>,
    pub sort_by: Option<String>,  // "age", "intake_date", "name", "created_at"
    pub sort_order: Option<String>, // "asc", "desc"
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct MedicalRecordQueryParams {
    pub record_type: Option<MedicalRecordType>,
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

// ============== Response DTOs ==============

#[derive(Debug, Serialize)]
pub struct RodentResponse {
    pub id: String,
    pub species: Species,
    pub name: String,
    pub gender: Gender,
    pub date_of_birth: Option<DateTime<Utc>>,
    pub date_of_birth_estimated: bool,
    pub age_months: Option<i64>,
    pub chip_id: Option<String>,
    pub status: RodentStatus,
    pub notes: Option<String>,
    pub images: Vec<RodentImageResponse>,
    pub intake_date: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct RodentImageResponse {
    pub id: String,
    pub filename: String,
    pub content_type: String,
    pub data: String,
    pub uploaded_at: DateTime<Utc>,
    pub is_primary: bool,
}

#[derive(Debug, Serialize)]
pub struct RodentListResponse {
    pub success: bool,
    pub rodents: Vec<RodentResponse>,
    pub total: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Serialize)]
pub struct SingleRodentResponse {
    pub success: bool,
    pub rodent: RodentResponse,
}

#[derive(Debug, Serialize)]
pub struct MedicalRecordResponse {
    pub id: String,
    pub rodent_id: String,
    pub record_type: MedicalRecordType,
    pub date: DateTime<Utc>,
    pub description: String,
    pub diagnosis: Option<String>,
    pub medications: Vec<Medication>,
    pub test_results: Option<String>,
    pub next_appointment: Option<DateTime<Utc>>,
    pub veterinarian_id: String,
    pub veterinarian_name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct MedicalRecordListResponse {
    pub success: bool,
    pub medical_records: Vec<MedicalRecordResponse>,
    pub total: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Serialize)]
pub struct SingleMedicalRecordResponse {
    pub success: bool,
    pub medical_record: MedicalRecordResponse,
}

#[derive(Debug, Serialize)]
pub struct StatusHistoryResponse {
    pub id: String,
    pub rodent_id: String,
    pub old_status: RodentStatus,
    pub new_status: RodentStatus,
    pub reason: Option<String>,
    pub changed_by: String,
    pub changed_by_name: String,
    pub changed_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct StatusHistoryListResponse {
    pub success: bool,
    pub history: Vec<StatusHistoryResponse>,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct ImageUploadResponse {
    pub success: bool,
    pub message: String,
    pub image_id: String,
}

// ============== Auth Info ==============

/// JWT Claims structure matching user-service tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // user_id
    pub username: String,
    pub role: String,
    pub exp: usize,       // expiration time
    pub iat: usize,       // issued at
}

#[derive(Debug, Clone)]
pub struct AuthInfo {
    pub user_id: String,
    pub username: String,
    pub role: String,
}

impl From<Claims> for AuthInfo {
    fn from(claims: Claims) -> Self {
        Self {
            user_id: claims.sub,
            username: claims.username,
            role: claims.role,
        }
    }
}

// ============== Helper Implementations ==============

impl From<Rodent> for RodentResponse {
    fn from(rodent: Rodent) -> Self {
        let age_months = rodent.date_of_birth.map(|dob| {
            let now = Utc::now();
            let duration = now.signed_duration_since(dob);
            duration.num_days() / 30
        });

        Self {
            id: rodent.id.map(|id| id.to_hex()).unwrap_or_default(),
            species: rodent.species,
            name: rodent.name,
            gender: rodent.gender,
            date_of_birth: rodent.date_of_birth,
            date_of_birth_estimated: rodent.date_of_birth_estimated,
            age_months,
            chip_id: rodent.chip_id,
            status: rodent.status,
            notes: rodent.notes,
            images: rodent.images.into_iter().map(|img| RodentImageResponse {
                id: img.id,
                filename: img.filename,
                content_type: img.content_type,
                data: img.data,
                uploaded_at: img.uploaded_at,
                is_primary: img.is_primary,
            }).collect(),
            intake_date: rodent.intake_date,
            created_at: rodent.created_at,
            updated_at: rodent.updated_at,
        }
    }
}

impl From<MedicalRecord> for MedicalRecordResponse {
    fn from(record: MedicalRecord) -> Self {
        Self {
            id: record.id.map(|id| id.to_hex()).unwrap_or_default(),
            rodent_id: record.rodent_id.to_hex(),
            record_type: record.record_type,
            date: record.date,
            description: record.description,
            diagnosis: record.diagnosis,
            medications: record.medications,
            test_results: record.test_results,
            next_appointment: record.next_appointment,
            veterinarian_id: record.veterinarian_id,
            veterinarian_name: record.veterinarian_name,
            created_at: record.created_at,
            updated_at: record.updated_at,
        }
    }
}

impl From<StatusHistory> for StatusHistoryResponse {
    fn from(history: StatusHistory) -> Self {
        Self {
            id: history.id.map(|id| id.to_hex()).unwrap_or_default(),
            rodent_id: history.rodent_id.to_hex(),
            old_status: history.old_status,
            new_status: history.new_status,
            reason: history.reason,
            changed_by: history.changed_by,
            changed_by_name: history.changed_by_name,
            changed_at: history.changed_at,
        }
    }
}

impl From<MedicationRequest> for Medication {
    fn from(req: MedicationRequest) -> Self {
        Self {
            name: req.name,
            dosage: req.dosage,
            frequency: req.frequency,
            duration: req.duration,
            notes: req.notes,
        }
    }
}
