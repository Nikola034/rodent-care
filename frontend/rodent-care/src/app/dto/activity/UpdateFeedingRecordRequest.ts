import { FoodType } from './FoodType';

export interface UpdateFeedingRecordRequest {
  food_type?: FoodType;
  quantity_grams?: number;
  meal_time?: string;
  notes?: string | null;
  consumed_fully?: boolean | null;
}
