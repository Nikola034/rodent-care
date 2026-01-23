mod config;
mod error;
mod handlers;
mod middleware;
mod proxy;
mod rate_limiter;

use axum::Router;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::rate_limiter::RateLimiter;

pub struct AppState {
    pub config: Config,
    pub http_client: reqwest::Client,
    pub rate_limiter: RateLimiter,
}

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    dotenvy::dotenv().ok();
    let config = Config::from_env();

    tracing::info!("Starting API Gateway on port {}", config.port);
    tracing::info!("User Service URL: {}", config.user_service_url);

    // Create HTTP client for proxying requests
    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client");

    // Create rate limiter
    let rate_limiter = RateLimiter::new(
        config.rate_limit_requests,
        config.rate_limit_window_secs,
    );

    // Create app state
    let state = Arc::new(AppState {
        config: config.clone(),
        http_client,
        rate_limiter,
    });

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build router
    let app = Router::new()
        .nest("/api", handlers::create_routes())
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // Start server
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.port))
        .await
        .unwrap();

    tracing::info!("API Gateway listening on {}", listener.local_addr().unwrap());

    axum::serve(listener, app).await.unwrap();
}
