export interface PopulationSummary {
  total_rodents: number;
  available_for_adoption: number;
  in_medical_care: number;
  recent_intakes_week: number;
}

export interface ActivitySummary {
  total_minutes_today: number;
  total_minutes_week: number;
  most_common_activity: string | null;
  active_rodents_today: number;
}

export interface FeedingSummary {
  total_grams_today: number;
  total_grams_week: number;
  feedings_today: number;
  feedings_week: number;
}

export interface RecentEvent {
  event_type: string;
  description: string;
  timestamp: string;
  rodent_name: string | null;
}

export interface DashboardSummaryResponse {
  success: boolean;
  population: PopulationSummary;
  activity: ActivitySummary;
  feeding: FeedingSummary;
  recent_events: RecentEvent[];
}
