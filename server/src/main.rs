/**
 * Author: GUCI
 * This is the main file for the server.
 * It is responsible for starting the server and handling requests.
 */

mod db;
mod models;
mod handlers;
mod routes; 
mod middleware;
mod error;

use std::sync::Arc;
use tokio::net::TcpListener;
use dotenvy::dotenv;
use tower_http::cors::{Any, CorsLayer};
use axum::http::Method;

pub struct AppState {
    pub db: mongodb::Database,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let database = db::init_db().await;
    let shared_state = Arc::new(AppState { db: database });

    let cors = CorsLayer::new()
        // Allow specific origin (Change this for production!)
        .allow_origin(Any) 
        // Allow specific methods
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::DELETE])
        // Allow headers like Content-Type and Authorization
        .allow_headers(Any);

    // Use the route factory we just built
    let app = routes::create_routes()
    .layer(cors)
        .with_state(shared_state);

    let listener = TcpListener::bind("0.0.0.0:4000").await.unwrap();
    println!("🚀 Server running on http://localhost:4000");
    axum::serve(listener, app).await.unwrap();
}