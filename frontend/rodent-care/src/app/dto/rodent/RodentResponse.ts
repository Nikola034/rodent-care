import { Gender } from './Gender';
import { RodentImage } from './RodentImage';
import { RodentStatus } from './RodentStatus';
import { Species } from './Species';

export interface RodentResponse {
  id: string;
  species: Species;
  name: string;
  gender: Gender;
  date_of_birth: string | null;
  date_of_birth_estimated: boolean;
  age_months: number | null;
  chip_id: string | null;
  status: RodentStatus;
  notes: string | null;
  images: RodentImage[];
  intake_date: string;
  created_at: string;
  updated_at: string;
}

export interface RodentListResponse {
  success: boolean;
  rodents: RodentResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface SingleRodentResponse {
  success: boolean;
  rodent: RodentResponse;
}
