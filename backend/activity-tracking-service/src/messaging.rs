use lapin::{
    options::{BasicPublishOptions, ExchangeDeclareOptions},
    types::FieldTable,
    BasicProperties, Channel, Connection, ConnectionProperties, ExchangeKind,
};
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{error, info, warn};

use crate::events::{
    DailyMetricsRecordedEvent, FeedingRecordedEvent, DAILY_METRICS_ROUTING_KEY, EXCHANGE_NAME,
    FEEDING_ROUTING_KEY,
};

/// RabbitMQ message publisher
pub struct MessagePublisher {
    channel: Arc<RwLock<Option<Channel>>>,
    rabbitmq_url: String,
}

impl MessagePublisher {
    pub async fn new(rabbitmq_url: &str) -> Result<Self, lapin::Error> {
        let publisher = Self {
            channel: Arc::new(RwLock::new(None)),
            rabbitmq_url: rabbitmq_url.to_string(),
        };

        // Try to connect, but don't fail if RabbitMQ is not available
        if let Err(e) = publisher.connect().await {
            warn!("Failed to connect to RabbitMQ on startup: {}. Will retry on publish.", e);
        }

        Ok(publisher)
    }

    async fn connect(&self) -> Result<(), lapin::Error> {
        info!("Connecting to RabbitMQ at {}", self.rabbitmq_url);

        let conn = Connection::connect(&self.rabbitmq_url, ConnectionProperties::default()).await?;
        let channel = conn.create_channel().await?;

        // Declare the exchange
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

        info!("Connected to RabbitMQ and declared exchange: {}", EXCHANGE_NAME);

        let mut ch = self.channel.write().await;
        *ch = Some(channel);

        Ok(())
    }

    async fn ensure_connected(&self) -> Result<(), lapin::Error> {
        let channel = self.channel.read().await;
        if channel.is_none() {
            drop(channel);
            self.connect().await?;
        }
        Ok(())
    }

    pub async fn publish_daily_metrics(&self, event: &DailyMetricsRecordedEvent) -> Result<(), String> {
        if let Err(e) = self.ensure_connected().await {
            error!("Failed to connect to RabbitMQ: {}", e);
            return Err(format!("RabbitMQ connection failed: {}", e));
        }

        let payload = serde_json::to_vec(event).map_err(|e| e.to_string())?;

        let channel = self.channel.read().await;
        if let Some(ch) = channel.as_ref() {
            ch.basic_publish(
                EXCHANGE_NAME,
                DAILY_METRICS_ROUTING_KEY,
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_content_type("application/json".into())
                    .with_delivery_mode(2), // Persistent
            )
            .await
            .map_err(|e| {
                error!("Failed to publish DailyMetricsRecorded event: {}", e);
                e.to_string()
            })?;

            info!(
                "Published DailyMetricsRecorded event: {} for rodent {}",
                event.event_id, event.payload.rodent_id
            );
            Ok(())
        } else {
            Err("No RabbitMQ channel available".to_string())
        }
    }

    pub async fn publish_feeding(&self, event: &FeedingRecordedEvent) -> Result<(), String> {
        if let Err(e) = self.ensure_connected().await {
            error!("Failed to connect to RabbitMQ: {}", e);
            return Err(format!("RabbitMQ connection failed: {}", e));
        }

        let payload = serde_json::to_vec(event).map_err(|e| e.to_string())?;

        let channel = self.channel.read().await;
        if let Some(ch) = channel.as_ref() {
            ch.basic_publish(
                EXCHANGE_NAME,
                FEEDING_ROUTING_KEY,
                BasicPublishOptions::default(),
                &payload,
                BasicProperties::default()
                    .with_content_type("application/json".into())
                    .with_delivery_mode(2), // Persistent
            )
            .await
            .map_err(|e| {
                error!("Failed to publish FeedingRecorded event: {}", e);
                e.to_string()
            })?;

            info!(
                "Published FeedingRecorded event: {} for rodent {}",
                event.event_id, event.payload.rodent_id
            );
            Ok(())
        } else {
            Err("No RabbitMQ channel available".to_string())
        }
    }
}
