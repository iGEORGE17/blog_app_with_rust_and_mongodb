use mongodb::{options::{ClientOptions, IndexOptions}, Client, Database, IndexModel};
use mongodb::bson::doc;
use std::env;
use crate::models::user::User;

pub struct AppState {
    pub db: Database,
}

pub async fn connect_db() -> Database {
    // 1. Load connection string from .env or default to localhost
    let mongodb_uri = env::var("MONGODB_URI")
        .unwrap_or_else(|_| "mongodb://localhost:27017".into());
    let db_name = env::var("MONGODB_DB_NAME")
        .unwrap_or_else(|_| "rust_blog_db".into());

    // 2. Parse options and connect
    let mut client_options = ClientOptions::parse(&mongodb_uri)
        .await
        .expect("Failed to parse MongoDB URI");
    
    client_options.app_name = Some("RustBlogAPI".to_string());

    let client = Client::with_options(client_options)
        .expect("Failed to initialize MongoDB client");

    let db = client.database(&db_name);

    // 3. Initialize Schema/Indexes
    init_db(&db).await;

    println!("✅ Connected to Database: {}", db_name);
    db
}

async fn init_db(db: &Database) {
    let user_collection = db.collection::<User>("users");

    // Define unique index for Email
    let email_index = IndexModel::builder()
        .keys(doc! { "email": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();

    // Define unique index for Username
    let username_index = IndexModel::builder()
        .keys(doc! { "username": 1 })
        .options(IndexOptions::builder().unique(true).build())
        .build();

    // Create the indexes
    let indexes = vec![email_index, username_index];
    
    match user_collection.create_indexes(indexes).await {
        Ok(_) => println!("🚀 Database indexes initialized (Email & Username are unique)"),
        Err(e) => {
            // This might fail if you already have duplicate data in your DB
            eprintln!("⚠️ Warning: Could not create indexes: {}. Check for existing duplicate data.", e);
        }
    }
}