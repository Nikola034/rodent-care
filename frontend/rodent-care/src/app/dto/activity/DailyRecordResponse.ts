export interface DailyRecordResponse {
  id: string;
  rodent_id: string;
  date: string;
  weight_grams: number | null;
  temperature_celsius: number | null;
  energy_level: number | null;
  mood_level: number | null;
  behavior_notes: string | null;
  recorded_by: string;
  recorded_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface DailyRecordListResponse {
  success: boolean;
  daily_records: DailyRecordResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface SingleDailyRecordResponse {
  success: boolean;
  daily_record: DailyRecordResponse;
}
