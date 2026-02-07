/**
 * Author: GUCI
 * This is the route for the post.
 * It is responsible for the post data.
 */


use axum::{routing::{get, post }, Router};
use std::sync::Arc;
use crate::handlers::post_handler::{create_post, get_posts, update_post, get_post_by_id, get_post_by_author, delete_post};
use crate::AppState;

pub fn post_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/", post(create_post))
        .route("/", get(get_posts))
        .route("/me", get(get_post_by_author))
        .route("/:id", get(get_post_by_id)
        .patch(update_post)
        .delete(delete_post)) // Protected

}