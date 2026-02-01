use axum::{extract::State, Json, http::StatusCode, response::IntoResponse, extract::Path};
use std::sync::Arc;
use bcrypt::{hash, verify, DEFAULT_COST};
use crate::models::user::{User, RegisterUserRequest, LoginRequest, AuthBody, Claims, UpdateUserRequest, UserResponse};
use crate::AppState;
use crate::error::AppError;
use chrono::Utc;
use jsonwebtoken::{encode, Header, EncodingKey};
use mongodb::bson::doc;
use validator::Validate;
use crate::middleware::AuthUser;
use bson::oid::ObjectId;
use futures::TryStreamExt;
use futures::stream::StreamExt;


/// Handler to register a new user
pub async fn register_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Validate the input (mapped to a Bad Request via AppError)
    payload.validate().map_err(|_| AppError::MissingCredentials)?;

    // 2. Hash the password
    let hashed = hash(payload.password, DEFAULT_COST)
        .map_err(|_| AppError::InternalServerError)?;

    // 3. Create the User struct (Including the role from payload)
    let new_user = User {
        id: None,
        username: payload.username,
        email: payload.email,
        password: hashed,
        role: payload.role, // Mapping the enum role
    };

    // 4. Insert into MongoDB
    let collection = state.db.collection::<User>("users");
    collection.insert_one(new_user).await
        .map_err(|_| AppError::InternalServerError)?;

    // 5. SUCCESS: Wrapped in Ok()
    Ok((StatusCode::CREATED, "User registered successfully"))
}

/// Handler to log in a user and return a JWT
pub async fn login_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<impl IntoResponse, AppError> {
    println!("--- Login Attempt: {} ---", payload.email);
    let collection = state.db.collection::<User>("users");

    // 1. Find user
    let user = collection
        .find_one(doc! { "email": &payload.email })
        .await
        .map_err(|e| {
            eprintln!("DB Error: {:?}", e);
            AppError::InternalServerError
        })?
        .ok_or(AppError::WrongCredentials)?;

    // 2. Verify password (Safe check)
    println!("Verifying password...");
    let is_valid = verify(&payload.password, &user.password).unwrap_or(false);
    if !is_valid {
        println!("Invalid password for {}", payload.email);
        return Err(AppError::WrongCredentials);
    }

    // 3. Create Claims safely
    let expiration = Utc::now()
        .checked_add_signed(chrono::Duration::hours(24))
        .expect("valid timestamp")
        .timestamp() as usize;

    // SAFE ID EXTRACTION: No .expect()
    let user_id = match user.id {
        Some(oid) => oid.to_hex(),
        None => {
            eprintln!("Error: User {} found but has no ObjectId", payload.email);
            return Err(AppError::InternalServerError);
        }
    };

    let claims = Claims {
        sub: user_id,
        role: user.role.to_string(),
        exp: expiration,
    };

    // 4. Encode JWT
    println!("Encoding JWT...");
    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "default_secret_key_123".into());
    
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).map_err(|e| {
        eprintln!("JWT Encoding Error: {:?}", e);
        AppError::InternalServerError
    })?;

    println!("Login successful!");
    Ok((StatusCode::OK, Json(AuthBody {
        access_token: token,
        token_type: "Bearer".to_string(),
    })))
}

/// Handler to get current user
pub async fn get_current_user(
    State(state): State<Arc<AppState>>,
    auth: AuthUser, // The extractor does the heavy lifting
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.collection::<User>("users");

    // Convert the string ID back to ObjectId
    let oid = mongodb::bson::oid::ObjectId::parse_str(&auth.user_id)
        .map_err(|_| AppError::NotFound)?;

    // Fetch user from DB
    let user = collection
        .find_one(doc! { "_id": oid })
        .await
        .map_err(|_| AppError::InternalServerError)?
        .ok_or(AppError::NotFound)?;

    // In your handler, convert User -> UserResponse
let response = UserResponse {
    id: user.id.unwrap().to_hex(),
    username: user.username,
    email: user.email,
    role: user.role.to_string(),
};

    Ok(Json(response))
}

/// Handler to update user
pub async fn update_profile(
    State(state): State<Arc<AppState>>,
    auth: AuthUser, // This extractor validates the JWT automatically
    Json(payload): Json<UpdateUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Validate input
    payload.validate().map_err(|_| AppError::MissingCredentials)?;

    let collection = state.db.collection::<User>("users");
    
    // 2. Convert string ID from JWT back to MongoDB ObjectId
    let user_id = ObjectId::parse_str(&auth.user_id)
        .map_err(|_| AppError::InternalServerError)?;

    // 3. Update the username if provided
    if let Some(new_username) = payload.username {
        collection
            .update_one(
                doc! { "_id": user_id },
                doc! { "$set": { "username": new_username } }
            )
            .await
            .map_err(|_| AppError::InternalServerError)?;
    }

    Ok((StatusCode::OK, "Profile updated successfully"))
}

/// Handler for admin to get all users
pub async fn get_all_users(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
) -> Result<impl IntoResponse, AppError> {
    // 1. Guard Clause
    if auth.role != "admin" {
        eprintln!("Unauthorized access attempt: User {} with role {}", auth.user_id, auth.role);
        return Err(AppError::Forbidden);
    }

    let collection = state.db.collection::<User>("users");

    // 2. Fetch Cursor
    let cursor = collection
        .find(doc! {})
        .await
        .map_err(|e| {
            eprintln!("Database Find Error: {:?}", e);
            AppError::InternalServerError
        })?;

    // 3. Clean Refactor: Collect the stream directly into a Vector
    // This replaces the manual while loop and handles the Result for each item
    let users: Vec<User> = cursor
        .collect::<Vec<Result<User, _>>>()
        .await
        .into_iter()
        .collect::<Result<Vec<User>, _>>()
        .map_err(|e| {
            eprintln!("Cursor Collection Error: {:?}", e);
            AppError::InternalServerError
        })?;

  let safe_users: Vec<UserResponse> = users
        .into_iter()
        .map(|u| UserResponse {
            id: u.id.map(|id| id.to_hex()).unwrap_or_default(),
            username: u.username,
            email: u.email,
            role: u.role.to_string(),
        })
        .collect();

    Ok(Json(safe_users))
}

/// Handler for admin to delete users
pub async fn delete_user(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(target_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    // 1. Admin Guard
    if auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    // 2. Prevent self-deletion
    if auth.user_id == target_id {
        return Err(AppError::BadRequest); // Or a specific "Cannot delete self" error
    }

    // 3. Convert string ID to MongoDB ObjectId
    let obj_id = ObjectId::parse_str(&target_id)
        .map_err(|_| AppError::BadRequest)?;

    let collection = state.db.collection::<User>("users");

    // 4. Execute deletion
    let result = collection
        .delete_one(doc! { "_id": obj_id })
        .await
        .map_err(|_| AppError::InternalServerError)?;

    if result.deleted_count == 0 {
        return Err(AppError::NotFound); // User didn't exist
    }

    Ok(StatusCode::NO_CONTENT) // 204 No Content is standard for successful deletes
}