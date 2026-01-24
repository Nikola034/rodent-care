import { ActivityType } from './ActivityType';
import { FoodType } from './FoodType';

export interface DailyRecordQueryParams {
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface ActivityQueryParams {
  activity_type?: ActivityType;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}

export interface FeedingQueryParams {
  food_type?: FoodType;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}
