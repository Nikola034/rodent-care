import { ActivityType } from './ActivityType';

export interface ActivityResponse {
  id: string;
  rodent_id: string;
  activity_type: ActivityType;
  duration_minutes: number;
  intensity: number | null;
  notes: string | null;
  recorded_by: string;
  recorded_by_name: string;
  recorded_at: string;
  created_at: string;
}

export interface ActivityListResponse {
  success: boolean;
  activities: ActivityResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface SingleActivityResponse {
  success: boolean;
  activity: ActivityResponse;
}
