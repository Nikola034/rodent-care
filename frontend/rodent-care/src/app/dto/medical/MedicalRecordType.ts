export type MedicalRecordType =
  | 'vaccination'
  | 'treatment'
  | 'diagnosis'
  | 'surgery'
  | 'check_up';

export const MEDICAL_RECORD_TYPE_OPTIONS: { label: string; value: MedicalRecordType }[] = [
  { label: 'Vaccination', value: 'vaccination' },
  { label: 'Treatment', value: 'treatment' },
  { label: 'Diagnosis', value: 'diagnosis' },
  { label: 'Surgery', value: 'surgery' },
  { label: 'Check-Up', value: 'check_up' }
];

export const getRecordTypeSeverity = (type: MedicalRecordType): string => {
  switch (type) {
    case 'vaccination': return 'success';
    case 'treatment': return 'info';
    case 'diagnosis': return 'warn';
    case 'surgery': return 'danger';
    case 'check_up': return 'secondary';
    default: return 'info';
  }
};
