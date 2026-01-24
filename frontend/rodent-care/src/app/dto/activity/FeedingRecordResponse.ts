import { FoodType } from './FoodType';

export interface FeedingRecordResponse {
  id: string;
  rodent_id: string;
  food_type: FoodType;
  quantity_grams: number;
  meal_time: string;
  notes: string | null;
  consumed_fully: boolean | null;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
}

export interface FeedingRecordListResponse {
  success: boolean;
  feeding_records: FeedingRecordResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface SingleFeedingRecordResponse {
  success: boolean;
  feeding_record: FeedingRecordResponse;
}
