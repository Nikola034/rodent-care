export interface CreateDailyRecordRequest {
  date: string;
  weight_grams: number | null;
  temperature_celsius: number | null;
  energy_level: number | null;
  mood_level: number | null;
  behavior_notes: string | null;
}
