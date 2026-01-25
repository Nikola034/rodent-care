use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ============== Exchange and Queue Configuration ==============

pub const EXCHANGE_NAME: &str = "rodent_care_events";
pub const ANALYTICS_QUEUE: &str = "analytics_events";

// Routing keys to subscribe to
pub const ACTIVITY_ROUTING_PATTERN: &str = "activity.*";
pub const REGISTRY_ROUTING_PATTERN: &str = "registry.*";

// ============== Activity Tracking Events ==============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyMetricsRecordedEvent {
    pub event_type: String,
    pub event_id: String,
    pub timestamp: DateTime<Utc>,
    pub payload: DailyMetricsPayload,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DailyMetricsPayload {
    pub record_id: String,
    pub rodent_id: String,
    pub date: DateTime<Utc>,
    pub weight_grams: Option<f64>,
    pub temperature_celsius: Option<f64>,
    pub energy_level: Option<i32>,
    pub mood_level: Option<i32>,
    pub has_health_observations: bool,
    pub recorded_by: String,
    pub recorded_by_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeedingRecordedEvent {
    pub event_type: String,
    pub event_id: String,
    pub timestamp: DateTime<Utc>,
    pub payload: FeedingPayload,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FeedingPayload {
    pub record_id: String,
    pub rodent_id: String,
    pub feeding_time: DateTime<Utc>,
    pub food_type: String,
    pub quantity_grams: f64,
    pub was_eaten: bool,
    pub recorded_by: String,
    pub recorded_by_name: String,
}

// ============== Rodent Registry Events ==============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RodentRegisteredEvent {
    pub event_type: String,
    pub event_id: String,
    pub timestamp: DateTime<Utc>,
    pub payload: RodentRegisteredPayload,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RodentRegisteredPayload {
    pub rodent_id: String,
    pub name: String,
    pub species: String,
    pub gender: String,
    pub date_of_birth: Option<DateTime<Utc>>,
    pub intake_date: DateTime<Utc>,
    pub status: String,
    pub registered_by: String,
    pub registered_by_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RodentStatusChangedEvent {
    pub event_type: String,
    pub event_id: String,
    pub timestamp: DateTime<Utc>,
    pub payload: RodentStatusChangedPayload,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RodentStatusChangedPayload {
    pub rodent_id: String,
    pub rodent_name: String,
    pub old_status: String,
    pub new_status: String,
    pub changed_by: String,
    pub changed_by_name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MedicalTreatmentAddedEvent {
    pub event_type: String,
    pub event_id: String,
    pub timestamp: DateTime<Utc>,
    pub payload: MedicalTreatmentPayload,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MedicalTreatmentPayload {
    pub record_id: String,
    pub rodent_id: String,
    pub rodent_name: String,
    pub record_type: String,
    pub description: String,
    pub diagnosis: Option<String>,
    pub treatment_date: DateTime<Utc>,
    pub veterinarian_name: String,
    pub added_by: String,
    pub added_by_name: String,
}

// ============== Generic Event Wrapper ==============

#[derive(Debug, Serialize, Deserialize)]
pub struct GenericEvent {
    pub event_type: String,
    pub event_id: String,
    pub timestamp: DateTime<Utc>,
}

// ============== Analytics Event Log (for storage) ==============

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalyticsEventLog {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<bson::oid::ObjectId>,
    pub event_type: String,
    pub event_id: String,
    pub routing_key: String,
    pub payload: serde_json::Value,
    pub received_at: DateTime<Utc>,
    pub processed: bool,
}
