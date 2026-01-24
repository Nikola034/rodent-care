import { RodentStatus } from './RodentStatus';

export interface UpdateRodentStatusRequest {
  status: RodentStatus;
  reason?: string | null;
}
