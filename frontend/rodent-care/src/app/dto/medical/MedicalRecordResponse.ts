import { Medication } from './Medication';
import { MedicalRecordType } from './MedicalRecordType';

export interface MedicalRecordResponse {
  id: string;
  rodent_id: string;
  record_type: MedicalRecordType;
  date: string;
  description: string;
  diagnosis: string | null;
  medications: Medication[];
  test_results: string | null;
  next_appointment: string | null;
  veterinarian_id: string;
  veterinarian_name: string;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecordListResponse {
  success: boolean;
  medical_records: MedicalRecordResponse[];
  total: number;
  page: number;
  limit: number;
}

export interface SingleMedicalRecordResponse {
  success: boolean;
  medical_record: MedicalRecordResponse;
}
