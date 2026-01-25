use axum::Router;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod db;
mod error;
mod events;
mod handlers;
mod messaging;
mod middleware;
mod models;
mod routes;

use config::Config;
use db::MongoDB;
use messaging::MessagePublisher;

pub struct AppState {
    pub db: MongoDB,
    pub config: Config,
    pub http_client: reqwest::Client,
    pub publisher: MessagePublisher,
}

#[tokio::main]
async fn main() {
    // Load environment variables
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "activity_tracking_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    info!("Starting Activity Tracking Service on port {}", config.port);

    // Connect to MongoDB
    let db = MongoDB::connect(&config)
        .await
        .expect("Failed to connect to MongoDB");

    // Create indexes
    db.create_indexes()
        .await
        .expect("Failed to create database indexes");

    // Create HTTP client for communicating with User Service
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client");

    // Initialize RabbitMQ publisher
    let publisher = MessagePublisher::new(&config.rabbitmq_url)
        .await
        .expect("Failed to create message publisher");

    // Create application state
    let state = Arc::new(AppState {
        db,
        config: config.clone(),
        http_client,
        publisher,
    });

    // Build router with middleware
    let app = Router::new()
        .nest("/api", routes::create_routes())
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let addr = format!("0.0.0.0:{}", config.port);
    let listener = TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    info!("Activity Tracking Service listening on {}", addr);

    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
}
