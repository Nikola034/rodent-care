use bson::oid::ObjectId;
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;

// ============== Enums ==============

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ActivityType {
    WheelRunning,
    Swimming,
    Digging,
    SocialInteraction,
    Playing,
    Grooming,
    Exploring,
    Resting,
    Other,
}

impl ActivityType {
    pub fn as_str(&self) -> &'static str {
        match self {
            ActivityType::WheelRunning => "wheel_running",
            ActivityType::Swimming => "swimming",
            ActivityType::Digging => "digging",
            ActivityType::SocialInteraction => "social_interaction",
            ActivityType::Playing => "playing",
            ActivityType::Grooming => "grooming",
            ActivityType::Exploring => "exploring",
            ActivityType::Resting => "resting",
            ActivityType::Other => "other",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FoodType {
    Pellets,
    Hay,
    Vegetables,
    Fruit,
    Protein,
    Treats,
    Supplements,
    Water,
    Other,
}

impl FoodType {
    pub fn as_str(&self) -> &'static str {
        match self {
            FoodType::Pellets => "pellets",
            FoodType::Hay => "hay",
            FoodType::Vegetables => "vegetables",
            FoodType::Fruit => "fruit",
            FoodType::Protein => "protein",
            FoodType::Treats => "treats",
            FoodType::Supplements => "supplements",
            FoodType::Water => "water",
            FoodType::Other => "other",
        }
    }
}

// ============== Database Models ==============

/// Daily measurements and observations for a rodent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DailyRecord {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub rodent_id: ObjectId,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub date: DateTime<Utc>,

    // Measurements
    pub weight_grams: Option<f64>,
    pub temperature_celsius: Option<f64>,
    pub energy_level: Option<i32>,  // 1-10 scale
    pub mood_level: Option<i32>,    // 1-10 scale

    // Behavior notes
    pub behavior_notes: Option<String>,
    pub health_observations: Option<String>,

    // Metadata
    pub created_by: String,
    pub created_by_name: String,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}

/// Individual activity record for a rodent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Activity {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub rodent_id: ObjectId,
    pub activity_type: ActivityType,
    pub duration_minutes: i32,
    pub notes: Option<String>,

    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub recorded_at: DateTime<Utc>,
    pub recorded_by: String,
    pub recorded_by_name: String,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}

/// Feeding record for a rodent
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeedingRecord {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub rodent_id: ObjectId,
    pub food_type: FoodType,
    pub quantity_grams: f64,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub meal_time: DateTime<Utc>,
    pub notes: Option<String>,
    pub consumed_fully: Option<bool>,

    pub recorded_by: String,
    pub recorded_by_name: String,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}

// ============== Request DTOs ==============

#[derive(Debug, Deserialize, Validate)]
pub struct CreateDailyRecordRequest {
    pub date: Option<NaiveDate>,
    #[validate(range(min = 0.0, max = 50000.0, message = "Weight must be between 0 and 50000 grams"))]
    pub weight_grams: Option<f64>,
    #[validate(range(min = 30.0, max = 45.0, message = "Temperature must be between 30 and 45 Celsius"))]
    pub temperature_celsius: Option<f64>,
    #[validate(range(min = 1, max = 10, message = "Energy level must be between 1 and 10"))]
    pub energy_level: Option<i32>,
    #[validate(range(min = 1, max = 10, message = "Mood level must be between 1 and 10"))]
    pub mood_level: Option<i32>,
    #[validate(length(max = 2000, message = "Behavior notes must be at most 2000 characters"))]
    pub behavior_notes: Option<String>,
    #[validate(length(max = 2000, message = "Health observations must be at most 2000 characters"))]
    pub health_observations: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateDailyRecordRequest {
    #[validate(range(min = 0.0, max = 50000.0, message = "Weight must be between 0 and 50000 grams"))]
    pub weight_grams: Option<f64>,
    #[validate(range(min = 30.0, max = 45.0, message = "Temperature must be between 30 and 45 Celsius"))]
    pub temperature_celsius: Option<f64>,
    #[validate(range(min = 1, max = 10, message = "Energy level must be between 1 and 10"))]
    pub energy_level: Option<i32>,
    #[validate(range(min = 1, max = 10, message = "Mood level must be between 1 and 10"))]
    pub mood_level: Option<i32>,
    #[validate(length(max = 2000, message = "Behavior notes must be at most 2000 characters"))]
    pub behavior_notes: Option<String>,
    #[validate(length(max = 2000, message = "Health observations must be at most 2000 characters"))]
    pub health_observations: Option<String>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateActivityRequest {
    pub activity_type: ActivityType,
    #[validate(range(min = 1, max = 1440, message = "Duration must be between 1 and 1440 minutes"))]
    pub duration_minutes: i32,
    #[validate(length(max = 500, message = "Notes must be at most 500 characters"))]
    pub notes: Option<String>,
    pub recorded_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreateFeedingRecordRequest {
    pub food_type: FoodType,
    #[validate(range(min = 0.1, max = 5000.0, message = "Quantity must be between 0.1 and 5000 grams"))]
    pub quantity_grams: f64,
    pub meal_time: Option<DateTime<Utc>>,
    #[validate(length(max = 500, message = "Notes must be at most 500 characters"))]
    pub notes: Option<String>,
    pub consumed_fully: Option<bool>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateFeedingRecordRequest {
    pub food_type: Option<FoodType>,
    #[validate(range(min = 0.1, max = 5000.0, message = "Quantity must be between 0.1 and 5000 grams"))]
    pub quantity_grams: Option<f64>,
    pub meal_time: Option<DateTime<Utc>>,
    #[validate(length(max = 500, message = "Notes must be at most 500 characters"))]
    pub notes: Option<String>,
    pub consumed_fully: Option<bool>,
}

// Query parameters
#[derive(Debug, Deserialize)]
pub struct DailyRecordQueryParams {
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ActivityQueryParams {
    pub activity_type: Option<ActivityType>,
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct FeedingQueryParams {
    pub food_type: Option<FoodType>,
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

// ============== Response DTOs ==============

#[derive(Debug, Serialize)]
pub struct DailyRecordResponse {
    pub id: String,
    pub rodent_id: String,
    pub date: DateTime<Utc>,
    pub weight_grams: Option<f64>,
    pub temperature_celsius: Option<f64>,
    pub energy_level: Option<i32>,
    pub mood_level: Option<i32>,
    pub behavior_notes: Option<String>,
    pub health_observations: Option<String>,
    pub created_by: String,
    pub created_by_name: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct DailyRecordListResponse {
    pub success: bool,
    pub daily_records: Vec<DailyRecordResponse>,
    pub total: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Serialize)]
pub struct SingleDailyRecordResponse {
    pub success: bool,
    pub daily_record: DailyRecordResponse,
}

#[derive(Debug, Serialize)]
pub struct ActivityResponse {
    pub id: String,
    pub rodent_id: String,
    pub activity_type: ActivityType,
    pub duration_minutes: i32,
    pub notes: Option<String>,
    pub recorded_at: DateTime<Utc>,
    pub recorded_by: String,
    pub recorded_by_name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ActivityListResponse {
    pub success: bool,
    pub activities: Vec<ActivityResponse>,
    pub total: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Serialize)]
pub struct SingleActivityResponse {
    pub success: bool,
    pub activity: ActivityResponse,
}

#[derive(Debug, Serialize)]
pub struct FeedingRecordResponse {
    pub id: String,
    pub rodent_id: String,
    pub food_type: FoodType,
    pub quantity_grams: f64,
    pub meal_time: DateTime<Utc>,
    pub notes: Option<String>,
    pub consumed_fully: Option<bool>,
    pub recorded_by: String,
    pub recorded_by_name: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct FeedingRecordListResponse {
    pub success: bool,
    pub feeding_records: Vec<FeedingRecordResponse>,
    pub total: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Serialize)]
pub struct SingleFeedingRecordResponse {
    pub success: bool,
    pub feeding_record: FeedingRecordResponse,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub success: bool,
    pub message: String,
}

// Daily summary combining all data for a specific day
#[derive(Debug, Serialize)]
pub struct DailySummaryResponse {
    pub success: bool,
    pub rodent_id: String,
    pub date: DateTime<Utc>,
    pub daily_record: Option<DailyRecordResponse>,
    pub activities: Vec<ActivityResponse>,
    pub feeding_records: Vec<FeedingRecordResponse>,
    pub total_activity_minutes: i32,
    pub total_food_grams: f64,
}

// ============== Auth Info ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
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

impl From<DailyRecord> for DailyRecordResponse {
    fn from(record: DailyRecord) -> Self {
        Self {
            id: record.id.map(|id| id.to_hex()).unwrap_or_default(),
            rodent_id: record.rodent_id.to_hex(),
            date: record.date,
            weight_grams: record.weight_grams,
            temperature_celsius: record.temperature_celsius,
            energy_level: record.energy_level,
            mood_level: record.mood_level,
            behavior_notes: record.behavior_notes,
            health_observations: record.health_observations,
            created_by: record.created_by,
            created_by_name: record.created_by_name,
            created_at: record.created_at,
            updated_at: record.updated_at,
        }
    }
}

impl From<Activity> for ActivityResponse {
    fn from(activity: Activity) -> Self {
        Self {
            id: activity.id.map(|id| id.to_hex()).unwrap_or_default(),
            rodent_id: activity.rodent_id.to_hex(),
            activity_type: activity.activity_type,
            duration_minutes: activity.duration_minutes,
            notes: activity.notes,
            recorded_at: activity.recorded_at,
            recorded_by: activity.recorded_by,
            recorded_by_name: activity.recorded_by_name,
            created_at: activity.created_at,
        }
    }
}

impl From<FeedingRecord> for FeedingRecordResponse {
    fn from(record: FeedingRecord) -> Self {
        Self {
            id: record.id.map(|id| id.to_hex()).unwrap_or_default(),
            rodent_id: record.rodent_id.to_hex(),
            food_type: record.food_type,
            quantity_grams: record.quantity_grams,
            meal_time: record.meal_time,
            notes: record.notes,
            consumed_fully: record.consumed_fully,
            recorded_by: record.recorded_by,
            recorded_by_name: record.recorded_by_name,
            created_at: record.created_at,
        }
    }
}
