import { FoodType } from './FoodType';

export interface CreateFeedingRecordRequest {
  food_type: FoodType;
  quantity_grams: number;
  meal_time: string | null;
  notes: string | null;
  consumed_fully: boolean | null;
}
