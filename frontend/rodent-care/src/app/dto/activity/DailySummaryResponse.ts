import { DailyRecordResponse } from './DailyRecordResponse';
import { ActivityResponse } from './ActivityResponse';
import { FeedingRecordResponse } from './FeedingRecordResponse';

export interface DailySummaryResponse {
  success: boolean;
  rodent_id: string;
  date: string;
  daily_record: DailyRecordResponse | null;
  activities: ActivityResponse[];
  feeding_records: FeedingRecordResponse[];
  total_activity_minutes: number;
  total_food_grams: number;
}
