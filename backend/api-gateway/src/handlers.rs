use axum::{
    body::Body,
    extract::{Request, State},
    middleware,
    response::{IntoResponse, Response},
    routing::{any, get},
    Json, Router,
};
use serde_json::json;
use std::sync::Arc;

use crate::{
    error::GatewayError,
    middleware::{auth_middleware, rate_limit_middleware},
    proxy::proxy_request,
    AppState,
};

// Health check endpoint
pub async fn health_check() -> impl IntoResponse {
    Json(json!({
        "success": true,
        "message": "API Gateway is healthy",
        "version": "1.0.0"
    }))
}

// Fallback handler for unmatched routes
pub async fn fallback_handler(request: Request<Body>) -> impl IntoResponse {
    let method = request.method().clone();
    let uri = request.uri().clone();
    tracing::warn!("No route matched: {} {}", method, uri);
    (
        axum::http::StatusCode::NOT_FOUND,
        Json(json!({
            "success": false,
            "error": format!("Route not found: {} {}", method, uri)
        }))
    )
}

// Service health aggregation
pub async fn services_health(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    let user_service_health = state
        .http_client
        .get(format!("{}/api/health", state.config.user_service_url))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false);

    let rodent_registry_health = state
        .http_client
        .get(format!("{}/api/health", state.config.rodent_registry_service_url))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false);

    let activity_tracking_health = state
        .http_client
        .get(format!("{}/api/health", state.config.activity_tracking_service_url))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false);

    Json(json!({
        "success": true,
        "services": {
            "user_service": user_service_health,
            "rodent_registry_service": rodent_registry_health,
            "activity_tracking_service": activity_tracking_health,
            "analytics_service": false // Not implemented yet
        }
    }))
}

// Proxy to User Service (public routes)
pub async fn proxy_to_user_service_public(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
) -> Result<Response, GatewayError> {
    proxy_request(State(state.clone()), &state.config.user_service_url, request).await
}

// Proxy to User Service (protected routes)
pub async fn proxy_to_user_service_protected(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
) -> Result<Response, GatewayError> {
    proxy_request(State(state.clone()), &state.config.user_service_url, request).await
}

// Proxy to Rodent Registry Service
pub async fn proxy_to_rodent_registry_service(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
) -> Result<Response, GatewayError> {
    proxy_request(State(state.clone()), &state.config.rodent_registry_service_url, request).await
}

// Proxy to Activity Tracking Service (placeholder for future)
pub async fn proxy_to_activity_tracking_service(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
) -> Result<Response, GatewayError> {
    proxy_request(State(state.clone()), &state.config.activity_tracking_service_url, request).await
}

// Proxy to Analytics Service (placeholder for future)
pub async fn proxy_to_analytics_service(
    State(state): State<Arc<AppState>>,
    request: Request<Body>,
) -> Result<Response, GatewayError> {
    proxy_request(State(state.clone()), &state.config.analytics_service_url, request).await
}

pub fn create_routes(state: Arc<AppState>) -> Router<Arc<AppState>> {
    // Public routes (no authentication required)
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/services/health", get(services_health))
        // Auth routes that don't require token
        .route("/auth/register", any(proxy_to_user_service_public))
        .route("/auth/login", any(proxy_to_user_service_public))
        .route("/auth/refresh", any(proxy_to_user_service_public));

    // Protected User Service routes (authentication required)
    let protected_user_routes = Router::new()
        .route("/auth/logout", any(proxy_to_user_service_protected))
        .route("/auth/validate", any(proxy_to_user_service_protected))
        .route("/users", any(proxy_to_user_service_protected))
        .route("/users/*path", any(proxy_to_user_service_protected))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    // Rodent Registry Service routes (protected with authentication)
    let rodent_routes = Router::new()
        .route("/rodents", any(proxy_to_rodent_registry_service))
        .route("/rodents/*path", any(proxy_to_rodent_registry_service))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    // Activity Tracking Service routes (protected with authentication)
    let activity_routes = Router::new()
        .route("/activities", any(proxy_to_activity_tracking_service))
        .route("/activities/*path", any(proxy_to_activity_tracking_service))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    let analytics_routes = Router::new()
        .route("/analytics", any(proxy_to_analytics_service))
        .route("/analytics/*path", any(proxy_to_analytics_service));

    // Combine all routes with rate limiting
    Router::new()
        .merge(public_routes)
        .merge(protected_user_routes)
        .merge(rodent_routes)
        .merge(activity_routes)
        .merge(analytics_routes)
        .fallback(fallback_handler)
        .layer(middleware::from_fn_with_state(state, rate_limit_middleware))
}
