use axum::{
    extract::{Request, State},
    http::header::AUTHORIZATION,
    middleware::Next,
    response::Response,
};
use std::sync::Arc;

use crate::{error::AppError, models::AuthInfo, AppState};

/// Extracts the Bearer token from the Authorization header
fn extract_bearer_token(auth_header: &str) -> Option<&str> {
    if auth_header.starts_with("Bearer ") {
        Some(&auth_header[7..])
    } else {
        None
    }
}

/// Authentication middleware that validates tokens via the User Service
pub async fn auth_middleware(
    State(state): State<Arc<AppState>>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    // Extract Authorization header
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or(AppError::InvalidToken)?;

    // Extract Bearer token
    let token = extract_bearer_token(auth_header).ok_or(AppError::InvalidToken)?;

    // Validate token with User Service
    let validation_url = format!("{}/api/auth/validate", state.config.user_service_url);

    let response = state
        .http_client
        .post(&validation_url)
        .json(&serde_json::json!({ "token": token }))
        .send()
        .await
        .map_err(|e| {
            tracing::error!("Failed to connect to User Service: {}", e);
            AppError::ServiceUnavailable("User Service unavailable".to_string())
        })?;

    if !response.status().is_success() {
        return Err(AppError::InvalidToken);
    }

    #[derive(serde::Deserialize)]
    struct ValidationResponse {
        valid: bool,
        user_id: Option<String>,
        username: Option<String>,
        role: Option<String>,
    }

    let validation: ValidationResponse = response.json().await.map_err(|e| {
        tracing::error!("Failed to parse validation response: {}", e);
        AppError::InternalError
    })?;

    if !validation.valid {
        return Err(AppError::InvalidToken);
    }

    // Create AuthInfo from validation response
    let auth_info = AuthInfo {
        user_id: validation.user_id.ok_or(AppError::InvalidToken)?,
        username: validation.username.ok_or(AppError::InvalidToken)?,
        role: validation.role.ok_or(AppError::InvalidToken)?,
    };

    // Insert auth info into request extensions for handlers to use
    request.extensions_mut().insert(auth_info);

    Ok(next.run(request).await)
}

/// Helper function to check if user has required role
pub fn check_role(auth_info: &AuthInfo, allowed_roles: &[&str]) -> Result<(), AppError> {
    if allowed_roles.contains(&auth_info.role.as_str()) {
        Ok(())
    } else {
        Err(AppError::AccessDenied(format!(
            "Requires one of the following roles: {}",
            allowed_roles.join(", ")
        )))
    }
}

/// Check if user can track activities (Caretaker, Veterinarian, or Admin)
pub fn can_track_activities(auth_info: &AuthInfo) -> Result<(), AppError> {
    check_role(auth_info, &["admin", "caretaker", "veterinarian"])
}

/// Check if user can view activities (all authenticated users)
pub fn can_view(_auth_info: &AuthInfo) -> Result<(), AppError> {
    // All authenticated users can view
    Ok(())
}
