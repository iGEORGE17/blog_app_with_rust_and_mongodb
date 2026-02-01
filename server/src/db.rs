use mongodb::{Client, Database};
use std::env;

pub struct AppState {
    pub db: Database,
}

pub async fn init_db() -> Database {
    let uri = env::var("MONGODB_URI").expect("MONGODB_URI must be set");
    let db_name = env::var("MONGODB_DB_NAME").expect("MONGODB_DB_NAME must be set");

    let client = Client::with_uri_str(uri)
        .await
        .expect("Failed to connect to MongoDB");
    
    // Check the connection
    client
        .database("admin")
        .run_command(mongodb::bson::doc! {"ping": 1})
        .await
        .expect("Ping failed: MongoDB is not reachable");

    println!("✅ Connected to MongoDB successfully!");
    client.database(&db_name)
}