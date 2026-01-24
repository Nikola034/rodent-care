use axum::{
    middleware,
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;

use crate::{handlers, middleware::auth_middleware, AppState};

pub fn create_routes(state: Arc<AppState>) -> Router {
    // Public routes (health check only)
    let public_routes = Router::new()
        .route("/health", get(handlers::health_check));

    // Protected routes (require authentication)
    let protected_routes = Router::new()
        // Rodent routes
        .route("/rodents", get(handlers::list_rodents))
        .route("/rodents", post(handlers::create_rodent))
        .route("/rodents/:id", get(handlers::get_rodent))
        .route("/rodents/:id", put(handlers::update_rodent))
        .route("/rodents/:id", delete(handlers::delete_rodent))
        .route("/rodents/:id/status", put(handlers::update_rodent_status))
        .route("/rodents/:id/status-history", get(handlers::get_rodent_status_history))
        // Image routes
        .route("/rodents/:id/images", post(handlers::upload_rodent_image))
        .route("/rodents/:rodent_id/images/:image_id", delete(handlers::delete_rodent_image))
        .route("/rodents/:rodent_id/images/:image_id/primary", put(handlers::set_primary_image))
        // Medical record routes
        .route("/rodents/:rodent_id/medical-records", get(handlers::list_medical_records))
        .route("/rodents/:rodent_id/medical-records", post(handlers::create_medical_record))
        .route("/rodents/:rodent_id/medical-records/:record_id", get(handlers::get_medical_record))
        .route("/rodents/:rodent_id/medical-records/:record_id", put(handlers::update_medical_record))
        .route("/rodents/:rodent_id/medical-records/:record_id", delete(handlers::delete_medical_record))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    // Combine routes under /api prefix
    Router::new()
        .nest("/api", public_routes.merge(protected_routes))
        .with_state(state)
}
