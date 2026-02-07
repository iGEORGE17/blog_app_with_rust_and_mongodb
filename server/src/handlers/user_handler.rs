use axum::{extract::State, Json, http::StatusCode, response::IntoResponse, extract::Path};
use std::sync::Arc;
use bcrypt::{hash, verify, DEFAULT_COST};
use crate::models::user::{AuthBody, Claims, LoginRequest, RegisterUserRequest, UpdateProfileRequest, User, UserResponse, UserRole};
use crate::AppState;
use crate::error::AppError;
use chrono::Utc;
use jsonwebtoken::{encode, Header, EncodingKey};
use mongodb::bson::doc;
use validator::Validate;
use crate::middleware::AuthUser;
use bson::oid::ObjectId;
use futures::stream::StreamExt;


pub async fn register_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterUserRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.collection::<User>("users");

    // 1. Check if email is already taken
    let count = collection
        .count_documents(doc! { "email": &payload.email })
        .await
        .map_err(|_| AppError::InternalServerError)?;

    if count > 0 {
        return Err(AppError::BadRequest);
    }

    // 2. Hash password
    let hashed_password = hash(payload.password, DEFAULT_COST)
        .map_err(|_| AppError::InternalServerError)?;

    // 3. Create the User instance with default Role
    let new_user = User {
        id: None,
        username: payload.username.clone(),
        email: payload.email.clone(),
        password: hashed_password,
        role: UserRole::User, // Hardcoded safety
    };

// 4. Insert with Duplicate Key detection (The safety net)
    let result = collection.insert_one(new_user).await.map_err(|e| {
        if let mongodb::error::ErrorKind::Write(
            mongodb::error::WriteFailure::WriteError(we),
        ) = *e.kind
        {
            if we.code == 11000 {
                return AppError::Conflict; // Catch race conditions
            }
        }
        AppError::InternalServerError
    })?;

    let new_id = result
        .inserted_id
        .as_object_id()
        .ok_or(AppError::InternalServerError)?;

    // 5. Create JWT
    let expiration = Utc::now()
        .checked_add_signed(chrono::Duration::hours(24))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: new_id.to_hex(),
        // Ensure UserRole has a to_string() or use format!("{:?}", role)
        role: format!("{:?}", UserRole::User), 
        exp: expiration,
    };

    let secret = std::env::var("JWT_SECRET").unwrap_or_else(|_| "secret".into());
    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ).map_err(|_| AppError::InternalServerError)?;

    // 6. Return both Token and User Object
    Ok((StatusCode::CREATED, Json(AuthBody {
        access_token: token,
        token_type: "Bearer".to_string(),
        user: UserResponse {
            id: new_id.to_hex(),
            username: payload.username,
            email: payload.email,
            role: UserRole::User.to_string(),
        },
    })))
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
        user: UserResponse {
            id: user.id.unwrap().to_hex(),
            username: user.username,
            email: user.email,
            role: user.role.to_string(),
        },
    })))
}


pub async fn logout_user() -> impl IntoResponse {
    // For JWT, logout is typically handled client-side by deleting the token.
    // Optionally, you could implement token blacklisting here.
    (StatusCode::OK, "Logged out successfully")
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

pub async fn update_profile(
    State(state): State<Arc<AppState>>,
    auth: AuthUser, // Your JWT extractor
    Json(payload): Json<UpdateProfileRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.collection::<User>("users");
    let obj_id = ObjectId::parse_str(&auth.user_id).map_err(|_| AppError::BadRequest)?;

    // 1. Build the update document
    let mut update_doc = doc! {};
    if let Some(u) = payload.username { update_doc.insert("username", u); }
    if let Some(e) = payload.email { update_doc.insert("email", e); }

    if update_doc.is_empty() {
        return Err(AppError::BadRequest);
    }

    // 2. Perform the update
    let result = collection
        .update_one(doc! { "_id": obj_id }, doc! { "$set": update_doc })
        .await;

    // 3. Handle Duplicate Key Errors (11000)
    match result {
        Ok(res) if res.matched_count == 0 => Err(AppError::NotFound),
        Ok(_) => Ok(StatusCode::OK),
        Err(e) => {
            if let mongodb::error::ErrorKind::Write(
                mongodb::error::WriteFailure::WriteError(we)
            ) = *e.kind {
                if we.code == 11000 {
                    // This triggers if the new username/email is already taken
                    return Err(AppError::Conflict);
                }
            }
            Err(AppError::InternalServerError)
        }
    }
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