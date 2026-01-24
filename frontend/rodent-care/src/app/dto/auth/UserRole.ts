export type UserRole = 'admin' | 'caretaker' | 'veterinarian' | 'volunteer';

export const USER_ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Caretaker', value: 'caretaker' },
  { label: 'Veterinarian', value: 'veterinarian' },
  { label: 'Volunteer', value: 'volunteer' }
];

export const getRoleSeverity = (role: UserRole): string => {
  switch (role) {
    case 'admin': return 'danger';
    case 'veterinarian': return 'info';
    case 'caretaker': return 'success';
    case 'volunteer': return 'secondary';
    default: return 'info';
  }
};
