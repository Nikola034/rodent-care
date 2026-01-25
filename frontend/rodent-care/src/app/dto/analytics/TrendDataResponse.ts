export interface TrendDataPoint {
  date: string;
  value: number;
  count: number;
}

export interface TrendDataResponse {
  success: boolean;
  period: string;
  data_points: TrendDataPoint[];
}
