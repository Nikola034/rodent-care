use dashmap::DashMap;
use std::time::{Duration, Instant};

pub struct RateLimiter {
    requests: DashMap<String, Vec<Instant>>,
    max_requests: u32,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: u32, window_secs: u64) -> Self {
        Self {
            requests: DashMap::new(),
            max_requests,
            window: Duration::from_secs(window_secs),
        }
    }

    pub fn check_rate_limit(&self, key: &str) -> bool {
        let now = Instant::now();
        let mut entry = self.requests.entry(key.to_string()).or_insert_with(Vec::new);
        
        // Remove old requests outside the window
        entry.retain(|&time| now.duration_since(time) < self.window);
        
        if entry.len() >= self.max_requests as usize {
            false
        } else {
            entry.push(now);
            true
        }
    }

    pub fn get_remaining(&self, key: &str) -> u32 {
        let now = Instant::now();
        
        if let Some(mut entry) = self.requests.get_mut(key) {
            entry.retain(|&time| now.duration_since(time) < self.window);
            self.max_requests.saturating_sub(entry.len() as u32)
        } else {
            self.max_requests
        }
    }
}
