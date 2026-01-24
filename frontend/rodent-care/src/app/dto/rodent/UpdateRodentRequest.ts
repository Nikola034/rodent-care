import { Gender } from './Gender';
import { Species } from './Species';

export interface UpdateRodentRequest {
  species?: Species;
  name?: string;
  gender?: Gender;
  date_of_birth?: string | null;
  date_of_birth_estimated?: boolean;
  chip_id?: string | null;
  notes?: string | null;
}
