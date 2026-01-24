use axum::{
    extract::{Request, State},
    http::header,
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::{error::GatewayError, AppState};

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenValidationResponse {
    pub valid: bool,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AuthInfo {
    pub user_id: String,
    pub username: String,
    pub role: String,
}

pub async fn rate_limit_middleware(
    State(state): State<Arc<AppState>>,
    request: Request,
    next: Next,
) -> Result<Response, GatewayError> {
    // Get client identifier (IP or user ID from token)
    let client_id = request
        .headers()
        .get("X-Forwarded-For")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    if !state.rate_limiter.check_rate_limit(&client_id) {
        tracing::warn!("Rate limit exceeded for client: {}", client_id);
        return Err(GatewayError::RateLimitExceeded);
    }

    Ok(next.run(request).await)
}

pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Result<Response, GatewayError> {
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|header| header.to_str().ok());

    let token = match auth_header {
        Some(header) if header.starts_with("Bearer ") => &header[7..],
        _ => return Err(GatewayError::InvalidToken),
    };

    // Validate token with User Service
    let validate_url = format!("{}/api/auth/validate", state.config.user_service_url);
    tracing::info!("Validating token with User Service at: {}", validate_url);
    tracing::info!("Token (first 50 chars): {}...", &token[..50.min(token.len())]);

    let validation_response = state
        .http_client
        .post(&validate_url)
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "token": token }))
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Token validation request failed: {:?}", e);
            GatewayError::ServiceUnavailable("User service unavailable".to_string())
        })?;

    let status = validation_response.status();
    tracing::info!("Token validation response status: {}", status);

    let response_text = validation_response.text().await.map_err(|e| {
        tracing::error!("Failed to read validation response: {:?}", e);
        GatewayError::InternalError
    })?;

    tracing::info!("Token validation response body: {}", response_text);

    let validation: TokenValidationResponse = serde_json::from_str(&response_text)
        .map_err(|e| {
            tracing::error!("Failed to parse validation response: {:?}", e);
            GatewayError::InternalError
        })?;

    tracing::info!("Token validation result: valid={}", validation.valid);

    if !validation.valid {
        return Err(GatewayError::InvalidToken);
    }

    // Add auth info to request extensions
    if let (Some(user_id), Some(username), Some(role)) = 
        (validation.user_id, validation.username, validation.role) 
    {
        request.extensions_mut().insert(AuthInfo {
            user_id,
            username,
            role,
        });
    }

    Ok(next.run(request).await)
}

pub fn check_role(auth_info: &AuthInfo, allowed_roles: &[&str]) -> Result<(), GatewayError> {
    if allowed_roles.contains(&auth_info.role.as_str()) {
        Ok(())
    } else {
        Err(GatewayError::AccessDenied)
    }
}
