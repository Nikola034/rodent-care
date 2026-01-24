use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;

use crate::{handlers, AppState};

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        // Public routes (no authentication required)
        .route("/auth/register", post(handlers::register))
        .route("/auth/login", post(handlers::login))
        .route("/auth/refresh", post(handlers::refresh_token))
        .route("/auth/validate", post(handlers::validate_token))
        .route("/health", get(handlers::health_check))
        // Protected routes (authentication handled by API Gateway, validated internally)
        .route("/auth/logout", post(handlers::logout))
        .route("/users/me", get(handlers::get_current_user).put(handlers::update_profile))
        // Admin routes (role checked in handlers)
        .route("/users", get(handlers::list_users))
        .route("/users/:id", get(handlers::get_user))
        .route("/users/:id/role", put(handlers::update_user_role))
        .route("/users/:id/status", put(handlers::update_user_status))
        .route("/users/:id", delete(handlers::delete_user))
        .route("/users/:id/activity-logs", get(handlers::get_user_activity_logs))
}
