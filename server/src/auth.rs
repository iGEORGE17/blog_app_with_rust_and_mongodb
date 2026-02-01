/**
 * JWT auth: shared claims, secret, and extractor for protected routes.
 */

use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Json, Response},
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: String,   // user id
    pub email: String,
    pub exp: i64,
    pub iat: i64,
}

pub fn get_jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret-change-in-production".to_string())
}

/// Extractor: requires `Authorization: Bearer <token>` and valid JWT.
#[derive(Debug, Clone)]
pub struct AuthUser(pub JwtClaims);

#[derive(Debug)]
pub struct AuthError {
    pub status: StatusCode,
    pub message: String,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        (self.status, Json(serde_json::json!({ "error": self.message }))).into_response()
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get("Authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AuthError {
                status: StatusCode::UNAUTHORIZED,
                message: "Missing Authorization header".to_string(),
            })?;

        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or_else(|| AuthError {
                status: StatusCode::UNAUTHORIZED,
                message: "Expected Bearer token".to_string(),
            })?;

        let secret = get_jwt_secret();
        let mut validation = Validation::default();
        validation.validate_exp = true;

        let token_data = decode::<JwtClaims>(
            token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &validation,
        )
        .map_err(|_| AuthError {
            status: StatusCode::UNAUTHORIZED,
            message: "Invalid or expired token".to_string(),
        })?;

        Ok(AuthUser(token_data.claims))
    }
}

/// Encode JWT (used by login). Re-export for user_routes.
pub fn encode_jwt(claims: &JwtClaims) -> Result<String, jsonwebtoken::errors::Error> {
    encode(
        &Header::default(),
        claims,
        &EncodingKey::from_secret(get_jwt_secret().as_bytes()),
    )
}
