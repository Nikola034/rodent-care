import { RodentStatus } from './RodentStatus';

export interface StatusHistoryResponse {
  id: string;
  rodent_id: string;
  old_status: RodentStatus;
  new_status: RodentStatus;
  reason: string | null;
  changed_by: string;
  changed_by_name: string;
  changed_at: string;
}

export interface StatusHistoryListResponse {
  success: boolean;
  history: StatusHistoryResponse[];
}
