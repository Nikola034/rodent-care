import { MedicalRecordType } from './MedicalRecordType';

export interface MedicalRecordQueryParams {
  record_type?: MedicalRecordType;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}
