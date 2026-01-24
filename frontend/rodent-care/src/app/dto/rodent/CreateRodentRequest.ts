import { Gender } from './Gender';
import { RodentStatus } from './RodentStatus';
import { Species } from './Species';

export interface CreateRodentRequest {
  species: Species;
  name: string;
  gender: Gender;
  date_of_birth?: string | null;
  date_of_birth_estimated?: boolean;
  chip_id?: string | null;
  status: RodentStatus;
  notes?: string | null;
  intake_date?: string | null;
}
