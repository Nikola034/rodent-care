export type RodentStatus =
  | 'active'
  | 'adopted'
  | 'quarantine'
  | 'medical_care'
  | 'deceased';

export const RODENT_STATUS_OPTIONS: { label: string; value: RodentStatus }[] = [
  { label: 'Active', value: 'active' },
  { label: 'Adopted', value: 'adopted' },
  { label: 'Quarantine', value: 'quarantine' },
  { label: 'Medical Care', value: 'medical_care' },
  { label: 'Deceased', value: 'deceased' }
];

export const getStatusSeverity = (status: RodentStatus): string => {
  switch (status) {
    case 'active': return 'success';
    case 'adopted': return 'info';
    case 'quarantine': return 'warn';
    case 'medical_care': return 'danger';
    case 'deceased': return 'secondary';
    default: return 'info';
  }
};
