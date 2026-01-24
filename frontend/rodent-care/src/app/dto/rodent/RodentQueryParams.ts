import { RodentStatus } from './RodentStatus';
import { Species } from './Species';

export interface RodentQueryParams {
  species?: Species;
  status?: RodentStatus;
  name?: string;
  chip_id?: string;
  sort_by?: 'age' | 'intake_date' | 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}
