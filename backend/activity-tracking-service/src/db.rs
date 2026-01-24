use mongodb::{Client, Database, IndexModel};
use bson::doc;
use tracing::info;

use crate::config::Config;

pub struct MongoDB {
    pub db: Database,
}

impl MongoDB {
    pub async fn connect(config: &Config) -> Result<Self, mongodb::error::Error> {
        let client = Client::with_uri_str(&config.mongodb_uri).await?;
        let db = client.database(&config.database_name);

        // Verify connection
        db.run_command(doc! { "ping": 1 }, None).await?;
        info!("Connected to MongoDB database: {}", config.database_name);

        Ok(Self { db })
    }

    pub async fn create_indexes(&self) -> Result<(), mongodb::error::Error> {
        // Daily records collection indexes
        let daily_records = self.db.collection::<bson::Document>("daily_records");

        // Index for rodent_id and date (compound, unique per day)
        let rodent_date_index = IndexModel::builder()
            .keys(doc! { "rodent_id": 1, "date": -1 })
            .build();

        // Index for user_id (who created the record)
        let user_index = IndexModel::builder()
            .keys(doc! { "created_by": 1 })
            .build();

        // Index for created_at
        let created_at_index = IndexModel::builder()
            .keys(doc! { "created_at": -1 })
            .build();

        daily_records.create_indexes(vec![
            rodent_date_index,
            user_index,
            created_at_index,
        ], None).await?;

        // Activities collection indexes
        let activities = self.db.collection::<bson::Document>("activities");

        // Index for rodent_id
        let activity_rodent_index = IndexModel::builder()
            .keys(doc! { "rodent_id": 1, "recorded_at": -1 })
            .build();

        // Index for activity_type
        let activity_type_index = IndexModel::builder()
            .keys(doc! { "activity_type": 1 })
            .build();

        activities.create_indexes(vec![
            activity_rodent_index,
            activity_type_index,
        ], None).await?;

        // Feeding records collection indexes
        let feeding_records = self.db.collection::<bson::Document>("feeding_records");

        // Index for rodent_id and meal_time
        let feeding_rodent_index = IndexModel::builder()
            .keys(doc! { "rodent_id": 1, "meal_time": -1 })
            .build();

        // Index for food_type
        let food_type_index = IndexModel::builder()
            .keys(doc! { "food_type": 1 })
            .build();

        feeding_records.create_indexes(vec![
            feeding_rodent_index,
            food_type_index,
        ], None).await?;

        info!("MongoDB indexes created successfully for Activity Tracking Service");

        Ok(())
    }
}
