import { MedicationRequest } from './Medication';
import { MedicalRecordType } from './MedicalRecordType';

export interface CreateMedicalRecordRequest {
  record_type: MedicalRecordType;
  date?: string | null;
  description: string;
  diagnosis?: string | null;
  medications?: MedicationRequest[];
  test_results?: string | null;
  next_appointment?: string | null;
}
