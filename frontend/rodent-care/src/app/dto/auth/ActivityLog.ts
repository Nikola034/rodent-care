export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  details: any | null;
  ip_address: string | null;
  created_at: string;
}

export interface ActivityLogsResponse {
  success: boolean;
  logs: ActivityLog[];
  total: number;
}
