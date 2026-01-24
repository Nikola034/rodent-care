export type UserStatus = 'pending' | 'active' | 'inactive';

export const USER_STATUS_OPTIONS: { label: string; value: UserStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
];

export const getStatusSeverity = (status: UserStatus): string => {
  switch (status) {
    case 'active': return 'success';
    case 'pending': return 'warn';
    case 'inactive': return 'danger';
    default: return 'info';
  }
};
