use axum::{
    routing::get,
    Router,
};
use std::sync::Arc;

use crate::handlers;
use crate::AppState;

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        // Health check (service status)
        .route("/analytics/service-health", get(handlers::health_check))

        // Dashboard summary
        .route("/analytics/dashboard", get(handlers::get_dashboard_summary))

        // Population analytics
        .route("/analytics/population", get(handlers::get_population_stats))

        // Health analytics (rodent health data)
        .route("/analytics/health", get(handlers::get_health_analytics))

        // Activity analytics
        .route("/analytics/activity", get(handlers::get_activity_analytics))

        // Feeding analytics
        .route("/analytics/feeding", get(handlers::get_feeding_analytics))

        // Trend data
        .route("/analytics/trends/weight", get(handlers::get_weight_trends))
        .route("/analytics/trends/activity", get(handlers::get_activity_trends))
        .route("/analytics/trends/feeding", get(handlers::get_feeding_trends))

        // Export endpoints
        .route("/analytics/export/population", get(handlers::export_population_csv))
        .route("/analytics/export/activity", get(handlers::export_activity_csv))
        .route("/analytics/export/feeding", get(handlers::export_feeding_csv))
}
