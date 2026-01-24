use axum::{
    routing::{delete, get, post, put},
    Router,
};
use std::sync::Arc;

use crate::{handlers, AppState};

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        // Public routes
        .route("/health", get(handlers::health_check))

        // Daily records routes
        .route("/activities/rodents/:rodent_id/daily-records", get(handlers::list_daily_records))
        .route("/activities/rodents/:rodent_id/daily-records", post(handlers::create_daily_record))
        .route("/activities/rodents/:rodent_id/daily-records/:record_id", get(handlers::get_daily_record))
        .route("/activities/rodents/:rodent_id/daily-records/:record_id", put(handlers::update_daily_record))
        .route("/activities/rodents/:rodent_id/daily-records/:record_id", delete(handlers::delete_daily_record))

        // Activities routes
        .route("/activities/rodents/:rodent_id/activities", get(handlers::list_activities))
        .route("/activities/rodents/:rodent_id/activities", post(handlers::create_activity))
        .route("/activities/rodents/:rodent_id/activities/:activity_id", delete(handlers::delete_activity))

        // Feeding records routes
        .route("/activities/rodents/:rodent_id/feeding-records", get(handlers::list_feeding_records))
        .route("/activities/rodents/:rodent_id/feeding-records", post(handlers::create_feeding_record))
        .route("/activities/rodents/:rodent_id/feeding-records/:record_id", put(handlers::update_feeding_record))
        .route("/activities/rodents/:rodent_id/feeding-records/:record_id", delete(handlers::delete_feeding_record))

        // Daily summary (combined view)
        .route("/activities/rodents/:rodent_id/summary/:date", get(handlers::get_daily_summary))
}
