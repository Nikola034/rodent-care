use mongodb::{Client, Database, IndexModel, options::IndexOptions};
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
        // Rodent collection indexes
        let rodents = self.db.collection::<bson::Document>("rodents");

        // Index for chip_id (unique, sparse - allows null)
        let chip_id_index = IndexModel::builder()
            .keys(doc! { "chip_id": 1 })
            .options(IndexOptions::builder()
                .unique(true)
                .sparse(true)
                .build())
            .build();

        // Index for species
        let species_index = IndexModel::builder()
            .keys(doc! { "species": 1 })
            .build();

        // Index for status
        let status_index = IndexModel::builder()
            .keys(doc! { "status": 1 })
            .build();

        // Index for name (text search)
        let name_index = IndexModel::builder()
            .keys(doc! { "name": "text" })
            .build();

        // Compound index for common queries
        let compound_index = IndexModel::builder()
            .keys(doc! { "species": 1, "status": 1, "created_at": -1 })
            .build();

        rodents.create_indexes(vec![
            chip_id_index,
            species_index,
            status_index,
            name_index,
            compound_index,
        ], None).await?;

        // Medical records collection indexes
        let medical_records = self.db.collection::<bson::Document>("medical_records");

        // Index for rodent_id
        let rodent_id_index = IndexModel::builder()
            .keys(doc! { "rodent_id": 1 })
            .build();

        // Index for record_type
        let record_type_index = IndexModel::builder()
            .keys(doc! { "record_type": 1 })
            .build();

        // Index for date
        let date_index = IndexModel::builder()
            .keys(doc! { "date": -1 })
            .build();

        // Compound index for rodent medical history
        let medical_compound_index = IndexModel::builder()
            .keys(doc! { "rodent_id": 1, "date": -1 })
            .build();

        medical_records.create_indexes(vec![
            rodent_id_index,
            record_type_index,
            date_index,
            medical_compound_index,
        ], None).await?;

        // Status history collection indexes
        let status_history = self.db.collection::<bson::Document>("status_history");

        let status_rodent_index = IndexModel::builder()
            .keys(doc! { "rodent_id": 1, "changed_at": -1 })
            .build();

        status_history.create_indexes(vec![status_rodent_index], None).await?;

        info!("MongoDB indexes created successfully");

        Ok(())
    }
}
