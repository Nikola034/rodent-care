use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, decode, EncodingKey, DecodingKey, Header, Validation};
use serde::Deserialize;
use std::sync::Arc;
use uuid::Uuid;
use validator::Validate;

use crate::{
    error::AppError,
    models::*,
    AppState,
};

// Helper function to extract claims from Authorization header
async fn extract_claims_from_header(
    state: &AppState,
    headers: &axum::http::HeaderMap,
) -> Result<Claims, AppError> {
    let auth_header = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .ok_or(AppError::InvalidToken)?;

    let token = if auth_header.starts_with("Bearer ") {
        &auth_header[7..]
    } else {
        return Err(AppError::InvalidToken);
    };

    let claims = jsonwebtoken::decode::<Claims>(
        token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| match e.kind() {
        jsonwebtoken::errors::ErrorKind::ExpiredSignature => AppError::TokenExpired,
        _ => AppError::InvalidToken,
    })?
    .claims;

    Ok(claims)
}

// Helper function to generate JWT tokens
fn generate_tokens(
    user: &User,
    config: &crate::config::Config,
) -> Result<(String, String, i64), AppError> {
    let now = Utc::now();
    let expires_in = config.jwt_expiration_hours * 3600; // in seconds
    
    let access_claims = Claims {
        sub: user.id.to_string(),
        username: user.username.clone(),
        role: user.role.to_string(),
        exp: (now + Duration::hours(config.jwt_expiration_hours)).timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    let access_token = encode(
        &Header::default(),
        &access_claims,
        &EncodingKey::from_secret(config.jwt_secret.as_bytes()),
    )
    .map_err(|_| AppError::InternalError)?;

    let refresh_token = Uuid::new_v4().to_string();

    Ok((access_token, refresh_token, expires_in))
}

// POST /api/auth/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<MessageResponse>), AppError> {
    // Validate input
    payload.validate().map_err(|e| AppError::ValidationError(e.to_string()))?;

    // Check if user can register as admin (only existing admin can create admin)
    if payload.role == UserRole::Admin {
        return Err(AppError::ValidationError(
            "Cannot register as admin. Contact system administrator.".to_string(),
        ));
    }

    // Check if username or email already exists
    let existing_user: Option<(Uuid,)> = sqlx::query_as(
        "SELECT id FROM users WHERE username = $1 OR email = $2",
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .fetch_optional(&state.db.pool)
    .await?;

    if existing_user.is_some() {
        return Err(AppError::UserAlreadyExists);
    }

    // Hash password
    let password_hash = bcrypt::hash(&payload.password, bcrypt::DEFAULT_COST)
        .map_err(|_| AppError::InternalError)?;

    // Insert user with pending status
    sqlx::query(
        r#"
        INSERT INTO users (username, email, password_hash, role, status)
        VALUES ($1, $2, $3, $4, 'pending')
        "#,
    )
    .bind(&payload.username)
    .bind(&payload.email)
    .bind(&password_hash)
    .bind(&payload.role)
    .execute(&state.db.pool)
    .await?;

    tracing::info!("New user registered: {} with role {:?}", payload.username, payload.role);

    Ok((
        StatusCode::CREATED,
        Json(MessageResponse {
            success: true,
            message: "Registration successful. Please wait for admin approval.".to_string(),
        }),
    ))
}

// POST /api/auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Find user by username
    let user: User = sqlx::query_as(
        "SELECT * FROM users WHERE username = $1",
    )
    .bind(&payload.username)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or(AppError::InvalidCredentials)?;

    // Verify password
    let password_valid = bcrypt::verify(&payload.password, &user.password_hash)
        .map_err(|_| AppError::InternalError)?;

    if !password_valid {
        return Err(AppError::InvalidCredentials);
    }

    // Check user status
    match user.status {
        UserStatus::Pending => return Err(AppError::AccountPendingApproval),
        UserStatus::Inactive => return Err(AppError::AccountInactive),
        UserStatus::Active => {}
    }

    // Generate tokens
    let (access_token, refresh_token, expires_in) = generate_tokens(&user, &state.config)?;

    // Store refresh token
    let refresh_expires_at = Utc::now() + Duration::days(state.config.refresh_token_expiration_days);
    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(&user.id)
    .bind(&refresh_token)
    .bind(&refresh_expires_at)
    .execute(&state.db.pool)
    .await?;

    // Log activity
    sqlx::query(
        r#"
        INSERT INTO activity_logs (user_id, action, details)
        VALUES ($1, 'login', '{"method": "password"}'::jsonb)
        "#,
    )
    .bind(&user.id)
    .execute(&state.db.pool)
    .await?;

    tracing::info!("User logged in: {}", user.username);

    Ok(Json(AuthResponse {
        success: true,
        access_token,
        refresh_token,
        token_type: "Bearer".to_string(),
        expires_in,
        user: user.into(),
    }))
}

// POST /api/auth/refresh
pub async fn refresh_token(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RefreshTokenRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    // Find valid refresh token
    let stored_token: RefreshToken = sqlx::query_as(
        r#"
        SELECT * FROM refresh_tokens 
        WHERE token = $1 AND revoked = FALSE AND expires_at > NOW()
        "#,
    )
    .bind(&payload.refresh_token)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or(AppError::InvalidToken)?;

    // Get user
    let user: User = sqlx::query_as(
        "SELECT * FROM users WHERE id = $1 AND status = 'active'",
    )
    .bind(&stored_token.user_id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or(AppError::UserNotFound)?;

    // Revoke old refresh token
    sqlx::query("UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1")
        .bind(&stored_token.id)
        .execute(&state.db.pool)
        .await?;

    // Generate new tokens
    let (access_token, new_refresh_token, expires_in) = generate_tokens(&user, &state.config)?;

    // Store new refresh token
    let refresh_expires_at = Utc::now() + Duration::days(state.config.refresh_token_expiration_days);
    sqlx::query(
        r#"
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        "#,
    )
    .bind(&user.id)
    .bind(&new_refresh_token)
    .bind(&refresh_expires_at)
    .execute(&state.db.pool)
    .await?;

    Ok(Json(AuthResponse {
        success: true,
        access_token,
        refresh_token: new_refresh_token,
        token_type: "Bearer".to_string(),
        expires_in,
        user: user.into(),
    }))
}

// POST /api/auth/logout
pub async fn logout(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
) -> Result<Json<MessageResponse>, AppError> {
    let claims = extract_claims_from_header(&state, &headers).await?;
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::InvalidToken)?;

    // Revoke all refresh tokens for user
    sqlx::query("UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1")
        .bind(&user_id)
        .execute(&state.db.pool)
        .await?;

    // Log activity
    sqlx::query(
        r#"
        INSERT INTO activity_logs (user_id, action)
        VALUES ($1, 'logout')
        "#,
    )
    .bind(&user_id)
    .execute(&state.db.pool)
    .await?;

    Ok(Json(MessageResponse {
        success: true,
        message: "Logged out successfully".to_string(),
    }))
}

// POST /api/auth/validate - For API Gateway to validate tokens
pub async fn validate_token(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ValidateTokenRequest>,
) -> Result<Json<TokenValidationResponse>, AppError> {
    let claims = match decode::<Claims>(
        &payload.token,
        &DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data.claims,
        Err(_) => {
            return Ok(Json(TokenValidationResponse {
                valid: false,
                user_id: None,
                username: None,
                role: None,
            }));
        }
    };

    let user_id = Uuid::parse_str(&claims.sub).ok();
    let role = match claims.role.as_str() {
        "admin" => Some(UserRole::Admin),
        "caretaker" => Some(UserRole::Caretaker),
        "veterinarian" => Some(UserRole::Veterinarian),
        "volunteer" => Some(UserRole::Volunteer),
        _ => None,
    };

    Ok(Json(TokenValidationResponse {
        valid: true,
        user_id,
        username: Some(claims.username),
        role,
    }))
}

// GET /api/users/me
pub async fn get_current_user(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
) -> Result<Json<UserResponse>, AppError> {
    let claims = extract_claims_from_header(&state, &headers).await?;
    let user_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::InvalidToken)?;

    let user: User = sqlx::query_as(
        "SELECT * FROM users WHERE id = $1",
    )
    .bind(&user_id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or(AppError::UserNotFound)?;

    Ok(Json(user.into()))
}

// Query parameters for listing users
#[derive(Debug, Deserialize)]
pub struct ListUsersQuery {
    pub status: Option<String>,
    pub role: Option<String>,
    pub page: Option<i64>,
    pub limit: Option<i64>,
}

// GET /api/users (Admin only)
pub async fn list_users(
    State(state): State<Arc<AppState>>,
    Query(query): Query<ListUsersQuery>,
) -> Result<Json<UsersListResponse>, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(20).min(100);
    let offset = (page - 1) * limit;

    let mut sql = String::from("SELECT * FROM users WHERE 1=1");
    let mut count_sql = String::from("SELECT COUNT(*) FROM users WHERE 1=1");

    if let Some(ref status) = query.status {
        sql.push_str(&format!(" AND status = '{}'", status));
        count_sql.push_str(&format!(" AND status = '{}'", status));
    }

    if let Some(ref role) = query.role {
        sql.push_str(&format!(" AND role = '{}'", role));
        count_sql.push_str(&format!(" AND role = '{}'", role));
    }

    sql.push_str(&format!(" ORDER BY created_at DESC LIMIT {} OFFSET {}", limit, offset));

    let users: Vec<User> = sqlx::query_as(&sql)
        .fetch_all(&state.db.pool)
        .await?;

    let total: (i64,) = sqlx::query_as(&count_sql)
        .fetch_one(&state.db.pool)
        .await?;

    Ok(Json(UsersListResponse {
        success: true,
        users: users.into_iter().map(|u| u.into()).collect(),
        total: total.0,
    }))
}

// GET /api/users/:id (Admin only)
pub async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<Uuid>,
) -> Result<Json<UserResponse>, AppError> {
    let user: User = sqlx::query_as(
        "SELECT * FROM users WHERE id = $1",
    )
    .bind(&user_id)
    .fetch_optional(&state.db.pool)
    .await?
    .ok_or(AppError::UserNotFound)?;

    Ok(Json(user.into()))
}

// PUT /api/users/:id/role (Admin only)
pub async fn update_user_role(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateUserRoleRequest>,
) -> Result<Json<MessageResponse>, AppError> {
    let claims = extract_claims_from_header(&state, &headers).await?;
    let admin_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::InvalidToken)?;

    // Prevent admin from changing their own role
    if admin_id == user_id {
        return Err(AppError::ValidationError(
            "Cannot change your own role".to_string(),
        ));
    }

    let result = sqlx::query(
        "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(&payload.role)
    .bind(&user_id)
    .execute(&state.db.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::UserNotFound);
    }

    // Log activity
    sqlx::query(
        r#"
        INSERT INTO activity_logs (user_id, action, details)
        VALUES ($1, 'update_user_role', $2::jsonb)
        "#,
    )
    .bind(&admin_id)
    .bind(serde_json::json!({
        "target_user_id": user_id.to_string(),
        "new_role": payload.role.to_string()
    }))
    .execute(&state.db.pool)
    .await?;

    Ok(Json(MessageResponse {
        success: true,
        message: "User role updated successfully".to_string(),
    }))
}

// PUT /api/users/:id/status (Admin only)
pub async fn update_user_status(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(payload): Json<UpdateUserStatusRequest>,
) -> Result<Json<MessageResponse>, AppError> {
    let claims = extract_claims_from_header(&state, &headers).await?;
    let admin_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::InvalidToken)?;

    // Prevent admin from deactivating themselves
    if admin_id == user_id && payload.status == UserStatus::Inactive {
        return Err(AppError::ValidationError(
            "Cannot deactivate your own account".to_string(),
        ));
    }

    let result = sqlx::query(
        "UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(&payload.status)
    .bind(&user_id)
    .execute(&state.db.pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::UserNotFound);
    }

    // Log activity
    sqlx::query(
        r#"
        INSERT INTO activity_logs (user_id, action, details)
        VALUES ($1, 'update_user_status', $2::jsonb)
        "#,
    )
    .bind(&admin_id)
    .bind(serde_json::json!({
        "target_user_id": user_id.to_string(),
        "new_status": format!("{:?}", payload.status)
    }))
    .execute(&state.db.pool)
    .await?;

    Ok(Json(MessageResponse {
        success: true,
        message: "User status updated successfully".to_string(),
    }))
}

// DELETE /api/users/:id (Admin only)
pub async fn delete_user(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Result<Json<MessageResponse>, AppError> {
    let claims = extract_claims_from_header(&state, &headers).await?;
    let admin_id = Uuid::parse_str(&claims.sub).map_err(|_| AppError::InvalidToken)?;

    // Prevent admin from deleting themselves
    if admin_id == user_id {
        return Err(AppError::ValidationError(
            "Cannot delete your own account".to_string(),
        ));
    }

    let result = sqlx::query("DELETE FROM users WHERE id = $1")
        .bind(&user_id)
        .execute(&state.db.pool)
        .await?;

    if result.rows_affected() == 0 {
        return Err(AppError::UserNotFound);
    }

    // Log activity
    sqlx::query(
        r#"
        INSERT INTO activity_logs (user_id, action, details)
        VALUES ($1, 'delete_user', $2::jsonb)
        "#,
    )
    .bind(&admin_id)
    .bind(serde_json::json!({
        "deleted_user_id": user_id.to_string()
    }))
    .execute(&state.db.pool)
    .await?;

    Ok(Json(MessageResponse {
        success: true,
        message: "User deleted successfully".to_string(),
    }))
}

// GET /api/users/:id/activity-logs (Admin only)
pub async fn get_user_activity_logs(
    State(state): State<Arc<AppState>>,
    Path(user_id): Path<Uuid>,
    Query(query): Query<ListUsersQuery>,
) -> Result<Json<ActivityLogsResponse>, AppError> {
    let page = query.page.unwrap_or(1).max(1);
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = (page - 1) * limit;

    let logs: Vec<ActivityLog> = sqlx::query_as(
        r#"
        SELECT * FROM activity_logs 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&user_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(&state.db.pool)
    .await?;

    let total: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM activity_logs WHERE user_id = $1",
    )
    .bind(&user_id)
    .fetch_one(&state.db.pool)
    .await?;

    Ok(Json(ActivityLogsResponse {
        success: true,
        logs,
        total: total.0,
    }))
}

// GET /api/health
pub async fn health_check() -> Json<MessageResponse> {
    Json(MessageResponse {
        success: true,
        message: "User Service is healthy".to_string(),
    })
}
