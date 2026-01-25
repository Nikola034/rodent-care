use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ============== Event Types ==============

pub const EXCHANGE_NAME: &str = "rodent_care_events";
pub const DAILY_METRICS_ROUTING_KEY: &str = "activity.daily_metrics";
pub const FEEDING_ROUTING_KEY: &str = "activity.feeding";

/// Event published when daily metrics are recorded for a rodent
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

impl DailyMetricsRecordedEvent {
    pub fn new(payload: DailyMetricsPayload) -> Self {
        Self {
            event_type: "DailyMetricsRecorded".to_string(),
            event_id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            payload,
        }
    }
}

/// Event published when a feeding record is created
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

impl FeedingRecordedEvent {
    pub fn new(payload: FeedingPayload) -> Self {
        Self {
            event_type: "FeedingRecorded".to_string(),
            event_id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            payload,
        }
    }
}
