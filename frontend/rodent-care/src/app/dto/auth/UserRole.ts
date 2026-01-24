export type UserRole = 'Admin' | 'Caretaker' | 'Veterinarian' | 'Volunteer';

export const USER_ROLE_OPTIONS: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Caretaker', value: 'Caretaker' },
  { label: 'Veterinarian', value: 'Veterinarian' },
  { label: 'Volunteer', value: 'Volunteer' }
];

export const getRoleSeverity = (role: UserRole): string => {
  switch (role) {
    case 'Admin': return 'danger';
    case 'Veterinarian': return 'info';
    case 'Caretaker': return 'success';
    case 'Volunteer': return 'secondary';
    default: return 'info';
  }
};
