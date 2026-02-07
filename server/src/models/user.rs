use mongodb::bson::oid::ObjectId;
use serde::{Deserialize, Serialize};
use std::fmt;
use validator::Validate;

// --- Enums ---

#[derive(Debug, Serialize, Deserialize, PartialEq, Clone)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    User,
    Admin,
}

/// Allows calling .to_string() on UserRole and using it in format!()
impl fmt::Display for UserRole {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            Self::User => write!(f, "user"),
            Self::Admin => write!(f, "admin"),
        }
    }
}

fn default_role() -> UserRole {
    UserRole::User
}

// --- Database Models ---

/// This is what is stored in MongoDB
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct User {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub username: String,
    pub email: String,
    pub password: String,
    pub role: UserRole,
}

// --- Request/Response DTOs ---

/// This is what we receive from the frontend during registration
#[derive(Debug, Serialize, Deserialize, Clone, Validate)]
pub struct RegisterUserRequest {
    #[validate(length(min = 3, message = "Username must be at least 3 characters"))]
    pub username: String,
    
    #[validate(email(message = "Invalid email format"))]
    pub email: String,
    
    #[validate(length(min = 6, message = "Password must be at least 6 characters"))]
    pub password: String,

    #[serde(default = "default_role")]
    pub role: UserRole,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct AuthBody {
    pub access_token: String,
    pub token_type: String,
    pub user: UserResponse, // <--- Add this
}


#[derive(Serialize)]
pub struct UserResponse {
    pub id: String,
    pub username: String,
    pub email: String,
    pub role: String,
}

// --- Auth Context ---

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,    // User ID
    pub role: String,   // Store as string for easy decoding in middleware
    pub exp: usize,     // Expiration
}

#[derive(Deserialize, Validate)]
pub struct UpdateProfileRequest {
    #[validate(length(min = 3, message = "Username must be at least 3 characters"))]
    pub username: Option<String>,
    pub email: Option<String>,
}