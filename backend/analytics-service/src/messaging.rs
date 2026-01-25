use futures::StreamExt;
use lapin::{
    options::{BasicAckOptions, BasicConsumeOptions, ExchangeDeclareOptions, QueueBindOptions, QueueDeclareOptions},
    types::FieldTable,
    Connection, ConnectionProperties, ExchangeKind,
};
use mongodb::Collection;
use std::sync::Arc;
use tracing::{error, info, warn};

use crate::db::MongoDB;
use crate::events::{
    AnalyticsEventLog, DailyMetricsRecordedEvent, FeedingRecordedEvent, GenericEvent,
    MedicalTreatmentAddedEvent, RodentRegisteredEvent, RodentStatusChangedEvent,
    ACTIVITY_ROUTING_PATTERN, ANALYTICS_QUEUE, EXCHANGE_NAME, REGISTRY_ROUTING_PATTERN,
};

/// RabbitMQ event consumer for analytics
pub struct EventConsumer {
    rabbitmq_url: String,
    db: Arc<MongoDB>,
}

impl EventConsumer {
    pub fn new(rabbitmq_url: &str, db: Arc<MongoDB>) -> Self {
        Self {
            rabbitmq_url: rabbitmq_url.to_string(),
            db,
        }
    }

    pub async fn start_consuming(&self) -> Result<(), lapin::Error> {
        info!("Connecting to RabbitMQ for event consumption at {}", self.rabbitmq_url);

        let conn = Connection::connect(&self.rabbitmq_url, ConnectionProperties::default()).await?;
        let channel = conn.create_channel().await?;

        // Declare the exchange (same as publishers)
        channel
            .exchange_declare(
                EXCHANGE_NAME,
                ExchangeKind::Topic,
                ExchangeDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        // Declare the analytics queue
        channel
            .queue_declare(
                ANALYTICS_QUEUE,
                QueueDeclareOptions {
                    durable: true,
                    ..Default::default()
                },
                FieldTable::default(),
            )
            .await?;

        // Bind queue to activity events
        channel
            .queue_bind(
                ANALYTICS_QUEUE,
                EXCHANGE_NAME,
                ACTIVITY_ROUTING_PATTERN,
                QueueBindOptions::default(),
                FieldTable::default(),
            )
            .await?;

        // Bind queue to registry events
        channel
            .queue_bind(
                ANALYTICS_QUEUE,
                EXCHANGE_NAME,
                REGISTRY_ROUTING_PATTERN,
                QueueBindOptions::default(),
                FieldTable::default(),
            )
            .await?;

        info!("Analytics queue bound to exchange. Starting consumer...");

        let mut consumer = channel
            .basic_consume(
                ANALYTICS_QUEUE,
                "analytics_consumer",
                BasicConsumeOptions::default(),
                FieldTable::default(),
            )
            .await?;

        let collection: Collection<AnalyticsEventLog> = self.db.analytics_db.collection("event_logs");

        info!("Event consumer started. Waiting for messages...");

        while let Some(delivery_result) = consumer.next().await {
            match delivery_result {
                Ok(delivery) => {
                    let routing_key = delivery.routing_key.to_string();
                    let data = &delivery.data;

                    match self.process_event(&routing_key, data, &collection).await {
                        Ok(_) => {
                            if let Err(e) = delivery.ack(BasicAckOptions::default()).await {
                                error!("Failed to ack message: {}", e);
                            }
                        }
                        Err(e) => {
                            error!("Failed to process event: {}", e);
                            // Still ack to prevent infinite redelivery
                            // In production, you might want to use dead-letter queues
                            if let Err(e) = delivery.ack(BasicAckOptions::default()).await {
                                error!("Failed to ack message after error: {}", e);
                            }
                        }
                    }
                }
                Err(e) => {
                    error!("Error receiving message: {}", e);
                }
            }
        }

        Ok(())
    }

    async fn process_event(
        &self,
        routing_key: &str,
        data: &[u8],
        collection: &Collection<AnalyticsEventLog>,
    ) -> Result<(), String> {
        let payload_str = String::from_utf8(data.to_vec()).map_err(|e| e.to_string())?;

        // First, parse as generic event to get type
        let generic: GenericEvent =
            serde_json::from_str(&payload_str).map_err(|e| format!("Failed to parse event: {}", e))?;

        info!(
            "Received event: type={}, id={}, routing_key={}",
            generic.event_type, generic.event_id, routing_key
        );

        // Process based on event type
        match generic.event_type.as_str() {
            "DailyMetricsRecorded" => {
                let event: DailyMetricsRecordedEvent = serde_json::from_str(&payload_str)
                    .map_err(|e| format!("Failed to parse DailyMetricsRecorded: {}", e))?;
                self.handle_daily_metrics(&event).await?;
            }
            "FeedingRecorded" => {
                let event: FeedingRecordedEvent = serde_json::from_str(&payload_str)
                    .map_err(|e| format!("Failed to parse FeedingRecorded: {}", e))?;
                self.handle_feeding(&event).await?;
            }
            "RodentRegistered" => {
                let event: RodentRegisteredEvent = serde_json::from_str(&payload_str)
                    .map_err(|e| format!("Failed to parse RodentRegistered: {}", e))?;
                self.handle_rodent_registered(&event).await?;
            }
            "RodentStatusChanged" => {
                let event: RodentStatusChangedEvent = serde_json::from_str(&payload_str)
                    .map_err(|e| format!("Failed to parse RodentStatusChanged: {}", e))?;
                self.handle_status_changed(&event).await?;
            }
            "MedicalTreatmentAdded" => {
                let event: MedicalTreatmentAddedEvent = serde_json::from_str(&payload_str)
                    .map_err(|e| format!("Failed to parse MedicalTreatmentAdded: {}", e))?;
                self.handle_medical_treatment(&event).await?;
            }
            _ => {
                warn!("Unknown event type: {}", generic.event_type);
            }
        }

        // Log the event
        let event_log = AnalyticsEventLog {
            id: None,
            event_type: generic.event_type,
            event_id: generic.event_id,
            routing_key: routing_key.to_string(),
            payload: serde_json::from_str(&payload_str).unwrap_or_default(),
            received_at: chrono::Utc::now(),
            processed: true,
        };

        collection
            .insert_one(event_log, None)
            .await
            .map_err(|e| format!("Failed to log event: {}", e))?;

        Ok(())
    }

    async fn handle_daily_metrics(&self, event: &DailyMetricsRecordedEvent) -> Result<(), String> {
        info!(
            "Processing DailyMetricsRecorded: rodent={}, weight={:?}, energy={:?}",
            event.payload.rodent_id, event.payload.weight_grams, event.payload.energy_level
        );
        // Analytics processing can be added here
        // For example: update running averages, detect anomalies, etc.
        Ok(())
    }

    async fn handle_feeding(&self, event: &FeedingRecordedEvent) -> Result<(), String> {
        info!(
            "Processing FeedingRecorded: rodent={}, food_type={}, quantity={}g",
            event.payload.rodent_id, event.payload.food_type, event.payload.quantity_grams
        );
        // Analytics processing can be added here
        Ok(())
    }

    async fn handle_rodent_registered(&self, event: &RodentRegisteredEvent) -> Result<(), String> {
        info!(
            "Processing RodentRegistered: rodent={}, name={}, species={}",
            event.payload.rodent_id, event.payload.name, event.payload.species
        );
        // Analytics processing can be added here
        // For example: update population statistics
        Ok(())
    }

    async fn handle_status_changed(&self, event: &RodentStatusChangedEvent) -> Result<(), String> {
        info!(
            "Processing RodentStatusChanged: rodent={}, {} -> {}",
            event.payload.rodent_id, event.payload.old_status, event.payload.new_status
        );
        // Analytics processing can be added here
        // For example: track adoption rates, mortality, etc.
        Ok(())
    }

    async fn handle_medical_treatment(&self, event: &MedicalTreatmentAddedEvent) -> Result<(), String> {
        info!(
            "Processing MedicalTreatmentAdded: rodent={}, type={}, vet={}",
            event.payload.rodent_id, event.payload.record_type, event.payload.veterinarian_name
        );
        // Analytics processing can be added here
        // For example: track treatment frequencies, common diagnoses, etc.
        Ok(())
    }
}

/// Start the event consumer in a background task
pub fn spawn_consumer(rabbitmq_url: String, db: Arc<MongoDB>) {
    tokio::spawn(async move {
        let consumer = EventConsumer::new(&rabbitmq_url, db);
        loop {
            match consumer.start_consuming().await {
                Ok(_) => {
                    info!("Consumer stopped normally");
                    break;
                }
                Err(e) => {
                    error!("Consumer error: {}. Reconnecting in 5 seconds...", e);
                    tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;
                }
            }
        }
    });
}
