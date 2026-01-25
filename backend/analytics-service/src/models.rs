use bson::oid::ObjectId;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

// ============== Enums ==============

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ReportType {
    Population,
    Health,
    Activity,
    Feeding,
    Monthly,
    Annual,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ReportFormat {
    Json,
    Csv,
    Pdf,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TimePeriod {
    Daily,
    Weekly,
    Monthly,
    Yearly,
    Custom,
}

// ============== Database Models ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedReport {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<ObjectId>,
    pub report_type: ReportType,
    pub title: String,
    pub description: Option<String>,
    pub parameters: ReportParameters,
    pub data: serde_json::Value,
    pub generated_by: String,
    pub generated_by_name: String,
    #[serde(with = "bson::serde_helpers::chrono_datetime_as_bson_datetime")]
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportParameters {
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub species: Option<Vec<String>>,
    pub rodent_ids: Option<Vec<String>>,
}

// ============== Query Parameters ==============

#[derive(Debug, Deserialize)]
pub struct AnalyticsQueryParams {
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub species: Option<String>,
    pub period: Option<TimePeriod>,
}

#[derive(Debug, Deserialize)]
pub struct ReportQueryParams {
    pub report_type: Option<ReportType>,
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub page: Option<u32>,
    pub limit: Option<u32>,
}

#[derive(Debug, Deserialize)]
pub struct ExportQueryParams {
    pub format: ReportFormat,
    pub from_date: Option<DateTime<Utc>>,
    pub to_date: Option<DateTime<Utc>>,
    pub species: Option<String>,
}

// ============== Response DTOs ==============

// Population Statistics
#[derive(Debug, Serialize)]
pub struct PopulationStatsResponse {
    pub success: bool,
    pub total_rodents: i64,
    pub by_species: Vec<SpeciesCount>,
    pub by_gender: GenderDistribution,
    pub by_status: Vec<StatusCount>,
    pub by_age_group: Vec<AgeGroupCount>,
    pub recent_intakes: i64,
    pub recent_adoptions: i64,
}

#[derive(Debug, Serialize)]
pub struct SpeciesCount {
    pub species: String,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Serialize)]
pub struct GenderDistribution {
    pub male: i64,
    pub female: i64,
    pub unknown: i64,
}

#[derive(Debug, Serialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct AgeGroupCount {
    pub age_group: String,
    pub count: i64,
}

// Health Analytics
#[derive(Debug, Serialize)]
pub struct HealthAnalyticsResponse {
    pub success: bool,
    pub weight_trends: Vec<WeightTrendData>,
    pub avg_weight_by_species: Vec<SpeciesWeightAvg>,
    pub energy_level_distribution: Vec<LevelDistribution>,
    pub mood_level_distribution: Vec<LevelDistribution>,
    pub health_observations_count: i64,
}

#[derive(Debug, Serialize)]
pub struct WeightTrendData {
    pub date: String,
    pub avg_weight: f64,
    pub min_weight: f64,
    pub max_weight: f64,
    pub rodent_count: i64,
}

#[derive(Debug, Serialize)]
pub struct SpeciesWeightAvg {
    pub species: String,
    pub avg_weight: f64,
    pub min_weight: f64,
    pub max_weight: f64,
}

#[derive(Debug, Serialize)]
pub struct LevelDistribution {
    pub level: i32,
    pub count: i64,
}

// Activity Analytics
#[derive(Debug, Serialize)]
pub struct ActivityAnalyticsResponse {
    pub success: bool,
    pub total_activity_minutes: i64,
    pub avg_daily_activity: f64,
    pub by_activity_type: Vec<ActivityTypeStats>,
    pub activity_by_hour: Vec<HourlyActivity>,
    pub activity_by_day_of_week: Vec<DayOfWeekActivity>,
    pub most_active_rodents: Vec<RodentActivityStats>,
}

#[derive(Debug, Serialize)]
pub struct ActivityTypeStats {
    pub activity_type: String,
    pub total_minutes: i64,
    pub session_count: i64,
    pub avg_duration: f64,
}

#[derive(Debug, Serialize)]
pub struct HourlyActivity {
    pub hour: i32,
    pub total_minutes: i64,
    pub session_count: i64,
}

#[derive(Debug, Serialize)]
pub struct DayOfWeekActivity {
    pub day: String,
    pub total_minutes: i64,
    pub session_count: i64,
}

#[derive(Debug, Serialize)]
pub struct RodentActivityStats {
    pub rodent_id: String,
    pub rodent_name: String,
    pub total_minutes: i64,
    pub session_count: i64,
}

// Feeding Analytics
#[derive(Debug, Serialize)]
pub struct FeedingAnalyticsResponse {
    pub success: bool,
    pub total_food_grams: f64,
    pub avg_daily_food: f64,
    pub by_food_type: Vec<FoodTypeStats>,
    pub feeding_by_hour: Vec<HourlyFeeding>,
    pub consumption_rate: f64,
    pub top_consumers: Vec<RodentFeedingStats>,
}

#[derive(Debug, Serialize)]
pub struct FoodTypeStats {
    pub food_type: String,
    pub total_grams: f64,
    pub feeding_count: i64,
    pub avg_quantity: f64,
}

#[derive(Debug, Serialize)]
pub struct HourlyFeeding {
    pub hour: i32,
    pub total_grams: f64,
    pub feeding_count: i64,
}

#[derive(Debug, Serialize)]
pub struct RodentFeedingStats {
    pub rodent_id: String,
    pub rodent_name: String,
    pub total_grams: f64,
    pub feeding_count: i64,
}

// Dashboard Summary
#[derive(Debug, Serialize)]
pub struct DashboardSummaryResponse {
    pub success: bool,
    pub population: PopulationSummary,
    pub activity: ActivitySummary,
    pub feeding: FeedingSummary,
    pub recent_events: Vec<RecentEvent>,
}

#[derive(Debug, Serialize)]
pub struct PopulationSummary {
    pub total_rodents: i64,
    pub available_for_adoption: i64,
    pub in_medical_care: i64,
    pub recent_intakes_week: i64,
}

#[derive(Debug, Serialize)]
pub struct ActivitySummary {
    pub total_minutes_today: i64,
    pub total_minutes_week: i64,
    pub most_common_activity: Option<String>,
    pub active_rodents_today: i64,
}

#[derive(Debug, Serialize)]
pub struct FeedingSummary {
    pub total_grams_today: f64,
    pub total_grams_week: f64,
    pub feedings_today: i64,
    pub feedings_week: i64,
}

#[derive(Debug, Serialize)]
pub struct RecentEvent {
    pub event_type: String,
    pub description: String,
    pub timestamp: DateTime<Utc>,
    pub rodent_name: Option<String>,
}

// Trend Data
#[derive(Debug, Serialize)]
pub struct TrendDataResponse {
    pub success: bool,
    pub period: String,
    pub data_points: Vec<TrendDataPoint>,
}

#[derive(Debug, Serialize)]
pub struct TrendDataPoint {
    pub date: String,
    pub value: f64,
    pub count: i64,
}

// Report List Response
#[derive(Debug, Serialize)]
pub struct SavedReportResponse {
    pub id: String,
    pub report_type: ReportType,
    pub title: String,
    pub description: Option<String>,
    pub generated_by_name: String,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct ReportListResponse {
    pub success: bool,
    pub reports: Vec<SavedReportResponse>,
    pub total: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Serialize)]
pub struct SingleReportResponse {
    pub success: bool,
    pub report: SavedReportWithData,
}

#[derive(Debug, Serialize)]
pub struct SavedReportWithData {
    pub id: String,
    pub report_type: ReportType,
    pub title: String,
    pub description: Option<String>,
    pub parameters: ReportParameters,
    pub data: serde_json::Value,
    pub generated_by_name: String,
    pub generated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub success: bool,
    pub message: String,
}

// ============== Auth Info ==============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub username: String,
    pub role: String,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Clone)]
pub struct AuthInfo {
    pub user_id: String,
    pub username: String,
    pub role: String,
}

impl From<Claims> for AuthInfo {
    fn from(claims: Claims) -> Self {
        Self {
            user_id: claims.sub,
            username: claims.username,
            role: claims.role,
        }
    }
}

// ============== Helper Implementations ==============

impl From<SavedReport> for SavedReportResponse {
    fn from(report: SavedReport) -> Self {
        Self {
            id: report.id.map(|id| id.to_hex()).unwrap_or_default(),
            report_type: report.report_type,
            title: report.title,
            description: report.description,
            generated_by_name: report.generated_by_name,
            generated_at: report.generated_at,
        }
    }
}

impl From<SavedReport> for SavedReportWithData {
    fn from(report: SavedReport) -> Self {
        Self {
            id: report.id.map(|id| id.to_hex()).unwrap_or_default(),
            report_type: report.report_type,
            title: report.title,
            description: report.description,
            parameters: report.parameters,
            data: report.data,
            generated_by_name: report.generated_by_name,
            generated_at: report.generated_at,
        }
    }
}
