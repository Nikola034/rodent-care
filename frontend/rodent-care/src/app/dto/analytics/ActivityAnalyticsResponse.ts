export interface ActivityTypeStats {
  activity_type: string;
  total_minutes: number;
  session_count: number;
  avg_duration: number;
}

export interface HourlyActivity {
  hour: number;
  total_minutes: number;
  session_count: number;
}

export interface DayOfWeekActivity {
  day: string;
  total_minutes: number;
  session_count: number;
}

export interface RodentActivityStats {
  rodent_id: string;
  rodent_name: string;
  total_minutes: number;
  session_count: number;
}

export interface ActivityAnalyticsResponse {
  success: boolean;
  total_activity_minutes: number;
  avg_daily_activity: number;
  by_activity_type: ActivityTypeStats[];
  activity_by_hour: HourlyActivity[];
  activity_by_day_of_week: DayOfWeekActivity[];
  most_active_rodents: RodentActivityStats[];
}
