// src/middleware.rs
use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    async_trait,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use crate::models::user::Claims;

pub struct AuthUser {
    pub user_id: String,
    pub role: String, // Keep this so we can check roles!
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, &'static str);

    // CHANGE: Added 'mut' to parts
    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // 1. Get the Authorization header
        let auth_header = parts.headers
            .get("Authorization")
            .and_then(|h| h.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "Missing Authorization header"))?;

        if !auth_header.starts_with("Bearer ") {
            return Err((StatusCode::UNAUTHORIZED, "Invalid token format"));
        }

        let token = &auth_header[7..];

        // 2. Decode and validate
        let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".into());
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(secret.as_ref()),
            &Validation::default(),
        )
        .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid or expired token"))?;

        // 3. Return the AuthUser with role support
        Ok(AuthUser { 
            user_id: token_data.claims.sub,
            role: token_data.claims.role, 
        })
    }
}