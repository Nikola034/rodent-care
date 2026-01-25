use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub mongodb_uri: String,
    pub database_name: String,
    pub jwt_secret: String,
    pub rodent_service_url: String,
    pub activity_service_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "8004".to_string())
                .parse()
                .expect("PORT must be a number"),
            mongodb_uri: env::var("MONGODB_URI")
                .unwrap_or_else(|_| "mongodb://localhost:27017".to_string()),
            database_name: env::var("DATABASE_NAME")
                .unwrap_or_else(|_| "analytics".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            rodent_service_url: env::var("RODENT_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8002".to_string()),
            activity_service_url: env::var("ACTIVITY_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8003".to_string()),
        }
    }
}
