

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

pub enum AppError {
    InvalidToken,        // Used in middleware
    WrongCredentials,    // Used in login
    MissingCredentials,  // Used in validation
    NotFound,            // Used when ID doesn't exist
    InternalServerError, // The "catch-all"
    Forbidden,           // For non-admins trying to do admin stuff
    BadRequest,
    Conflict
}


impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            Self::InternalServerError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error",
            ),
            Self::WrongCredentials => (
                StatusCode::UNAUTHORIZED, 
                "Invalid email or password"
            ),
            Self::MissingCredentials => (
                StatusCode::BAD_REQUEST, 
                "Missing or invalid input"
            ),
            Self::NotFound => (
                StatusCode::NOT_FOUND, 
                "Resource not found"
            ),
            Self::InvalidToken => (
                StatusCode::UNAUTHORIZED, 
                "Invalid or expired token"
            ),
            // Add this line to satisfy the compiler!
            Self::Forbidden => (
                StatusCode::FORBIDDEN, 
                "You do not have permission to perform this action"
            ),
            Self::BadRequest => (StatusCode::BAD_REQUEST, "Bad Request"),
            Self::Conflict => (StatusCode::CONFLICT, "Resource already exists"),
        };


        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}