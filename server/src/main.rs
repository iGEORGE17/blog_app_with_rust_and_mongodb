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

pub struct AppState {
    pub db: mongodb::Database,
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    let database = db::init_db().await;
    let shared_state = Arc::new(AppState { db: database });

    // Use the route factory we just built
    let app = routes::create_routes()
        .with_state(shared_state);

    let listener = TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("🚀 Server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}