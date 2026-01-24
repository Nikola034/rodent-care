export type UserStatus = 'Pending' | 'Active' | 'Inactive';

export const USER_STATUS_OPTIONS: { label: string; value: UserStatus }[] = [
  { label: 'Pending', value: 'Pending' },
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' }
];

export const getStatusSeverity = (status: UserStatus): string => {
  switch (status) {
    case 'Active': return 'success';
    case 'Pending': return 'warn';
    case 'Inactive': return 'danger';
    default: return 'info';
  }
};
