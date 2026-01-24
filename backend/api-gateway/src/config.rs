use std::env;

#[derive(Clone)]
pub struct Config {
    pub port: u16,
    pub user_service_url: String,
    pub rodent_registry_service_url: String,
    pub activity_tracking_service_url: String,
    pub analytics_service_url: String,
    pub rate_limit_requests: u32,
    pub rate_limit_window_secs: u64,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "8000".to_string())
                .parse()
                .expect("PORT must be a number"),
            user_service_url: env::var("USER_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8001".to_string()),
            rodent_registry_service_url: env::var("RODENT_REGISTRY_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8002".to_string()),
            activity_tracking_service_url: env::var("ACTIVITY_TRACKING_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8003".to_string()),
            analytics_service_url: env::var("ANALYTICS_SERVICE_URL")
                .unwrap_or_else(|_| "http://localhost:8004".to_string()),
            rate_limit_requests: env::var("RATE_LIMIT_REQUESTS")
                .unwrap_or_else(|_| "100".to_string())
                .parse()
                .expect("RATE_LIMIT_REQUESTS must be a number"),
            rate_limit_window_secs: env::var("RATE_LIMIT_WINDOW_SECS")
                .unwrap_or_else(|_| "60".to_string())
                .parse()
                .expect("RATE_LIMIT_WINDOW_SECS must be a number"),
        }
    }
}
