/**
 * Author: GUCI
 * This is the model for the post.
 * It is responsible for the post data.
 */

use mongodb::bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use validator::Validate;
use mongodb::bson::serde_helpers::chrono_datetime_as_bson_datetime;


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Post {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub author_id: ObjectId, // Linked to User._id
    pub title: String,
    pub content: String,
    #[serde(with = "chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
    #[serde(with = "chrono_datetime_as_bson_datetime")]
    pub updated_at: DateTime<Utc>,
}


#[derive(Serialize, Deserialize)]
pub struct PostWithAuthor {
    #[serde(rename = "_id")]
    pub id: ObjectId,
    pub title: String,
    pub content: String,
    pub author_name: String, // We'll pull this from the User collection
    #[serde(with = "chrono_datetime_as_bson_datetime")]
    pub created_at: DateTime<Utc>,
}



#[derive(Deserialize, Validate)]
pub struct CreatePostRequest {
    #[validate(length(min = 5, max = 100))]
    pub title: String,
    
    #[validate(length(min = 10))]
    pub content: String,
}

#[derive(Deserialize)]
pub struct UpdatePostRequest {
    pub title: Option<String>,
    pub content: Option<String>,
}
