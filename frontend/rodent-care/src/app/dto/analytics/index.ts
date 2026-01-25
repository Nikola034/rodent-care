export * from './PopulationStatsResponse';
export * from './HealthAnalyticsResponse';
export * from './ActivityAnalyticsResponse';
export * from './FeedingAnalyticsResponse';
export * from './DashboardSummaryResponse';
export * from './TrendDataResponse';

export interface AnalyticsQueryParams {
  from_date?: string;
  to_date?: string;
  species?: string;
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
}

export interface ExportQueryParams {
  format: 'json' | 'csv' | 'pdf';
  from_date?: string;
  to_date?: string;
  species?: string;
}
