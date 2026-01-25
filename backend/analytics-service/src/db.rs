use mongodb::{Client, Database, IndexModel};
use bson::doc;
use tracing::info;

use crate::config::Config;

#[derive(Clone)]
pub struct MongoDB {
    pub db: Database,
    pub rodent_db: Database,
    pub activity_db: Database,
    pub analytics_db: Database,
}

impl MongoDB {
    pub async fn connect(config: &Config) -> Result<Self, mongodb::error::Error> {
        let client = Client::with_uri_str(&config.mongodb_uri).await?;

        // Analytics service's own database
        let db = client.database(&config.database_name);

        // Access to other services' databases for read-only aggregations
        let rodent_db = client.database("rodent_registry");
        let activity_db = client.database("activity_tracking");

        // Verify connection
        db.run_command(doc! { "ping": 1 }, None).await?;
        info!("Connected to MongoDB database: {}", config.database_name);

        // analytics_db is the same as db, used by messaging consumer
        let analytics_db = db.clone();

        Ok(Self { db, rodent_db, activity_db, analytics_db })
    }

    pub async fn create_indexes(&self) -> Result<(), mongodb::error::Error> {
        // Reports collection indexes
        let reports = self.db.collection::<bson::Document>("reports");

        // Index for report type and date
        let report_type_index = IndexModel::builder()
            .keys(doc! { "report_type": 1, "generated_at": -1 })
            .build();

        // Index for user who generated report
        let user_index = IndexModel::builder()
            .keys(doc! { "generated_by": 1 })
            .build();

        reports.create_indexes(vec![
            report_type_index,
            user_index,
        ], None).await?;

        // Analytics cache collection indexes
        let analytics_cache = self.db.collection::<bson::Document>("analytics_cache");

        // Index for cache key and expiration
        let cache_key_index = IndexModel::builder()
            .keys(doc! { "cache_key": 1 })
            .build();

        let cache_expire_index = IndexModel::builder()
            .keys(doc! { "expires_at": 1 })
            .build();

        analytics_cache.create_indexes(vec![
            cache_key_index,
            cache_expire_index,
        ], None).await?;

        info!("MongoDB indexes created successfully for Analytics Service");

        Ok(())
    }
}
