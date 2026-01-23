use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum GatewayError {
    #[error("Invalid token")]
    InvalidToken,

    #[error("Token expired")]
    TokenExpired,

    #[error("Access denied")]
    AccessDenied,

    #[error("Rate limit exceeded")]
    RateLimitExceeded,

    #[error("Service unavailable: {0}")]
    ServiceUnavailable(String),

    #[error("Bad gateway: {0}")]
    BadGateway(String),

    #[error("Internal server error")]
    InternalError,
}

impl IntoResponse for GatewayError {
    fn into_response(self) -> Response {
        let (status, error_message) = match &self {
            GatewayError::InvalidToken => (StatusCode::UNAUTHORIZED, self.to_string()),
            GatewayError::TokenExpired => (StatusCode::UNAUTHORIZED, self.to_string()),
            GatewayError::AccessDenied => (StatusCode::FORBIDDEN, self.to_string()),
            GatewayError::RateLimitExceeded => (StatusCode::TOO_MANY_REQUESTS, self.to_string()),
            GatewayError::ServiceUnavailable(_) => (StatusCode::SERVICE_UNAVAILABLE, self.to_string()),
            GatewayError::BadGateway(_) => (StatusCode::BAD_GATEWAY, self.to_string()),
            GatewayError::InternalError => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        let body = Json(json!({
            "success": false,
            "error": error_message,
        }));

        (status, body).into_response()
    }
}
