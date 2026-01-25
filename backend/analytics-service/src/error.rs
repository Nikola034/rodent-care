use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Invalid token")]
    InvalidToken,

    #[error("Token expired")]
    TokenExpired,

    #[error("Access denied: {0}")]
    AccessDenied(String),

    #[error("Invalid date range")]
    InvalidDateRange,

    #[error("Invalid ID format")]
    InvalidId,

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Internal server error")]
    InternalError,

    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),

    #[error("Data not found")]
    NotFound,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            AppError::InvalidToken => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::TokenExpired => (StatusCode::UNAUTHORIZED, self.to_string()),
            AppError::AccessDenied(_) => (StatusCode::FORBIDDEN, self.to_string()),
            AppError::InvalidDateRange => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::InvalidId => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::DatabaseError(_) => {
                tracing::error!("Database error: {}", self);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error".to_string())
            }
            AppError::InternalError => {
                tracing::error!("Internal error occurred");
                (StatusCode::INTERNAL_SERVER_ERROR, self.to_string())
            }
            AppError::ServiceUnavailable(_) => (StatusCode::SERVICE_UNAVAILABLE, self.to_string()),
            AppError::NotFound => (StatusCode::NOT_FOUND, self.to_string()),
        };

        let body = Json(json!({
            "success": false,
            "error": error_message
        }));

        (status, body).into_response()
    }
}

impl From<mongodb::error::Error> for AppError {
    fn from(err: mongodb::error::Error) -> Self {
        tracing::error!("MongoDB error: {:?}", err);
        AppError::DatabaseError(err.to_string())
    }
}

impl From<bson::oid::Error> for AppError {
    fn from(_: bson::oid::Error) -> Self {
        AppError::InvalidId
    }
}
