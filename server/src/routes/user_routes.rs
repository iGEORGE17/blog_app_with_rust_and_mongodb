/**
 * Author: GUCI
 * This is the route for the user.
 * It is responsible for the user data.
 */

use axum::{Router, routing::{get, patch, post, delete}};
use std::sync::Arc;
use crate::handlers::user_handler::{get_current_user, login_user, register_user, update_profile, get_all_users, delete_user};
use crate::AppState;

pub fn user_routes() -> Router<Arc<AppState>> {
    Router::new()
        .route("/register", post(register_user))
        .route("/login", post(login_user)) 
        .route("/me", get(get_current_user))
        .route("/edit_profile", patch(update_profile)) 
        .route("/admin/users", get(get_all_users))
        .route("/admin/users/:id", delete(delete_user))
}