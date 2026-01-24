import { ActivityType } from './ActivityType';

export interface CreateActivityRequest {
  activity_type: ActivityType;
  duration_minutes: number;
  intensity: number | null;
  notes: string | null;
  recorded_at: string | null;
}
