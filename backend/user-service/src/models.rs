use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

// Database models

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "user_role", rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Caretaker,
    Veterinarian,
    Volunteer,
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::Admin => write!(f, "admin"),
            UserRole::Caretaker => write!(f, "caretaker"),
            UserRole::Veterinarian => write!(f, "veterinarian"),
            UserRole::Volunteer => write!(f, "volunteer"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "user_status", rename_all = "lowercase")]
pub enum UserStatus {
    Pending,
    Active,
    Inactive,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct User {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct RefreshToken {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub revoked: bool,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ActivityLog {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub details: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

// Request DTOs

#[derive(Debug, Deserialize, Validate)]
pub struct RegisterRequest {
    #[validate(length(min = 3, max = 50, message = "Username must be between 3 and 50 characters"))]
    pub username: String,
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    pub password: String,
    pub role: UserRole,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub refresh_token: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRoleRequest {
    pub role: UserRole,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserStatusRequest {
    pub status: UserStatus,
}

#[derive(Debug, Deserialize, Validate)]
pub struct UpdateProfileRequest {
    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    pub password: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ValidateTokenRequest {
    pub token: String,
}

// Response DTOs

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
    pub expires_in: i64,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub email: String,
    pub role: UserRole,
    pub status: UserStatus,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status,
            created_at: user.created_at,
        }
    }
}

#[derive(Debug, Serialize)]
pub struct UsersListResponse {
    pub success: bool,
    pub users: Vec<UserResponse>,
    pub total: i64,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct TokenValidationResponse {
    pub valid: bool,
    pub user_id: Option<Uuid>,
    pub username: Option<String>,
    pub role: Option<UserRole>,
}

#[derive(Debug, Serialize)]
pub struct ActivityLogsResponse {
    pub success: bool,
    pub logs: Vec<ActivityLog>,
    pub total: i64,
}

// JWT Claims

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,  // user_id
    pub username: String,
    pub role: String,
    pub exp: usize,   // expiration time
    pub iat: usize,   // issued at
}
