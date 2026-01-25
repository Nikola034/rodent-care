use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub mongodb_uri: String,
    pub database_name: String,
    pub user_service_url: String,
    pub max_image_size_mb: usize,
    pub jwt_secret: String,
    pub rabbitmq_url: String,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "8002".to_string())
                .parse()
                .expect("PORT must be a number"),
            mongodb_uri: env::var("MONGODB_URI")
                .unwrap_or_else(|_| "mongodb://localhost:27017".to_string()),
            database_name: env::var("DATABASE_NAME")
                .unwrap_or_else(|_| "rodent_registry".to_string()),
            user_service_url: env::var("USER_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8001".to_string()),
            max_image_size_mb: env::var("MAX_IMAGE_SIZE_MB")
                .unwrap_or_else(|_| "5".to_string())
                .parse()
                .expect("MAX_IMAGE_SIZE_MB must be a number"),
            jwt_secret: env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            rabbitmq_url: env::var("RABBITMQ_URL")
                .unwrap_or_else(|_| "amqp://rodentcare:rodentcare_password@localhost:5672".to_string()),
        }
    }
}
