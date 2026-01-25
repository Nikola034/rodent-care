use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ============== Event Types ==============

pub const EXCHANGE_NAME: &str = "rodent_care_events";
pub const RODENT_REGISTERED_ROUTING_KEY: &str = "registry.rodent_registered";
pub const RODENT_STATUS_CHANGED_ROUTING_KEY: &str = "registry.rodent_status_changed";
pub const MEDICAL_TREATMENT_ADDED_ROUTING_KEY: &str = "registry.medical_treatment";

/// Event published when a new rodent is registered
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

impl RodentRegisteredEvent {
    pub fn new(payload: RodentRegisteredPayload) -> Self {
        Self {
            event_type: "RodentRegistered".to_string(),
            event_id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            payload,
        }
    }
}

/// Event published when a rodent's status changes
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

impl RodentStatusChangedEvent {
    pub fn new(payload: RodentStatusChangedPayload) -> Self {
        Self {
            event_type: "RodentStatusChanged".to_string(),
            event_id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            payload,
        }
    }
}

/// Event published when a medical treatment is added
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

impl MedicalTreatmentAddedEvent {
    pub fn new(payload: MedicalTreatmentPayload) -> Self {
        Self {
            event_type: "MedicalTreatmentAdded".to_string(),
            event_id: uuid::Uuid::new_v4().to_string(),
            timestamp: Utc::now(),
            payload,
        }
    }
}
