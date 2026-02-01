

use axum::{extract::State, Json, http::StatusCode, response::IntoResponse};
use std::sync::Arc;
use chrono::Utc;
use crate::error::AppError;
use mongodb::bson::doc;
use futures::stream::TryStreamExt; // Required for helper methods like try_collect()
use crate::models::post::{Post, CreatePostRequest, PostWithAuthor, UpdatePostRequest};
use crate::AppState;
use crate::middleware::AuthUser;
use mongodb::options::FindOptions;
use serde::Deserialize;
use axum::extract::Path;
use bson::oid::ObjectId;


pub async fn create_post(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Json(payload): Json<CreatePostRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.collection::<Post>("posts");

    // Convert string ID from JWT back to ObjectId
    let author_id = ObjectId::parse_str(&auth.user_id)
        .map_err(|_| AppError::BadRequest)?;

    let new_post = Post {
        id: None,
        author_id,
        title: payload.title,
        content: payload.content,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let result = collection.insert_one(new_post).await
        .map_err(|_| AppError::InternalServerError)?;

    Ok((StatusCode::CREATED, Json(result.inserted_id)))
}


pub async fn get_posts_with_authors(
    State(state): State<Arc<AppState>>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.collection::<Post>("posts");

    // Define the pipeline
    let pipeline = vec![
        // 1. Join with users collection
        doc! {
            "$lookup": {
                "from": "users",
                "localField": "author_id",
                "foreignField": "_id",
                "as": "author_info"
            }
        },
        // 2. lookup returns an array, "unwind" it to a single object
        doc! { "$unwind": "$author_info" },
        // 3. Project only the fields we want
        doc! {
            "$project": {
                "_id": 1,
                "title": 1,
                "content": 1,
                "created_at": 1,
                "author_name": "$author_info.username" // Map username to author_name
            }
        },
    ];

    let mut cursor = collection.aggregate(pipeline).await
        .map_err(|_| AppError::InternalServerError)?;

    let mut results = Vec::new();
    while let Some(doc) = cursor.try_next().await.map_err(|_| AppError::InternalServerError)? {
        // Convert BSON document to our Rust struct
        let post: PostWithAuthor = bson::from_document(doc)
            .map_err(|_| AppError::InternalServerError)?;
        results.push(post);
    }

    Ok(Json(results))
}


pub async fn update_post(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(post_id): Path<String>,
    Json(payload): Json<UpdatePostRequest>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.collection::<Post>("posts");
    
    // 1. Validate ID
    let obj_id = ObjectId::parse_str(&post_id).map_err(|e| {
        eprintln!("ID Parsing Error: {}", e);
        AppError::BadRequest
    })?;

    // 2. Fetch & Ownership Check
    // We only select the author_id to save bandwidth
    let post = collection
        .find_one(doc! { "_id": obj_id })
        .await
        .map_err(|e| {
            eprintln!("Find Error: {:?}", e);
            AppError::InternalServerError
        })?
        .ok_or(AppError::NotFound)?;

    if post.author_id.to_hex() != auth.user_id && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    // 3. Build Update Document Idiomatically
    let mut update_fields = doc! {};
    if let Some(t) = payload.title { update_fields.insert("title", t); }
    if let Some(c) = payload.content { update_fields.insert("content", c); }
    
    // If nothing was provided to update, just return early
    if update_fields.is_empty() {
        return Ok(StatusCode::OK.into_response());
    }

    update_fields.insert("updated_at", Utc::now());

    // 4. Perform Update and Handle Result
    let update_result = collection
        .update_one(doc! { "_id": obj_id }, doc! { "$set": update_fields })
        .await
        .map_err(|e| {
            // THIS IS THE LINE THAT WILL TELL YOU WHY IT 500s
            eprintln!("CRITICAL: MongoDB UpdateOne Failed: {:?}", e);
            AppError::InternalServerError
        })?;

    if update_result.matched_count == 0 {
        return Err(AppError::NotFound);
    }

    // 5. Explicit JSON Response
    // Returning a JSON body is safer than a bare StatusCode for many clients
    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "success",
            "message": "Post updated successfully"
        })),
    ).into_response())
}


pub async fn get_post_by_id(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>, // Ensure Path is imported from axum::extract
) -> Result<impl IntoResponse, AppError> {
    println!("DEBUG: Searching for ID: {}", id);
    let collection = state.db.collection::<Post>("posts");
    
    // 1. Convert the URL string to an ObjectId
    let obj_id = ObjectId::parse_str(&id).map_err(|_| {
        eprintln!("Invalid ID format: {}", id);
        AppError::BadRequest
    })?;

    // 2. Use a simpler pipeline for debugging
    let pipeline = vec![
        doc! { "$match": { "_id": obj_id } },
        doc! {
            "$lookup": {
                "from": "users",
                "localField": "author_id",
                "foreignField": "_id",
                "as": "author_info"
            }
        },
        doc! { "$unwind": "$author_info" },
        doc! {
            "$project": {
                "_id": 1,
                "title": 1,
                "content": 1,
                "created_at": 1,
                "author_name": "$author_info.username"
            }
        },
    ];

    let mut cursor = collection.aggregate(pipeline).await
        .map_err(|_| AppError::InternalServerError)?;

    // 3. Try to get the first result
    if let Some(doc) = cursor.try_next().await.map_err(|_| AppError::InternalServerError)? {
        let post: PostWithAuthor = bson::from_document(doc).map_err(|e| {
            println!("Mapping error: {:?}", e);
            AppError::InternalServerError
        })?;
        return Ok(Json(post));
    }

    // If no document found, return 404
    Err(AppError::NotFound)
}

pub async fn delete_post(
    State(state): State<Arc<AppState>>,
    auth: AuthUser,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let collection = state.db.collection::<Post>("posts");
    let obj_id = ObjectId::parse_str(&id).map_err(|_| AppError::BadRequest)?;

    // 1. Find post to check ownership
    let post = collection.find_one(doc! { "_id": obj_id }).await
        .map_err(|_| AppError::InternalServerError)?
        .ok_or(AppError::NotFound)?;

    // 2. Ownership Guard
    if post.author_id.to_hex() != auth.user_id && auth.role != "admin" {
        return Err(AppError::Forbidden);
    }

    // 3. Delete
    collection.delete_one(doc! { "_id": obj_id }).await
        .map_err(|_| AppError::InternalServerError)?;

        Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "success",
            "message": "Post deleted successfully"
        })),
    ).into_response())
}


