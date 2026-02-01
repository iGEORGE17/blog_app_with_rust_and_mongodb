pub mod post_routes;
pub mod user_routes;

use axum::Router;
use std::sync::Arc;
use crate::AppState;

pub fn create_routes() -> Router<Arc<AppState>> {
    Router::new()
        .nest("/users", user_routes::user_routes())
        .nest("/posts", post_routes::post_routes())
}