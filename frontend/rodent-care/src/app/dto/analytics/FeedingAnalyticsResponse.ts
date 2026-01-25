export interface FoodTypeStats {
  food_type: string;
  total_grams: number;
  feeding_count: number;
  avg_quantity: number;
}

export interface HourlyFeeding {
  hour: number;
  total_grams: number;
  feeding_count: number;
}

export interface RodentFeedingStats {
  rodent_id: string;
  rodent_name: string;
  total_grams: number;
  feeding_count: number;
}

export interface FeedingAnalyticsResponse {
  success: boolean;
  total_food_grams: number;
  avg_daily_food: number;
  by_food_type: FoodTypeStats[];
  feeding_by_hour: HourlyFeeding[];
  consumption_rate: number;
  top_consumers: RodentFeedingStats[];
}
