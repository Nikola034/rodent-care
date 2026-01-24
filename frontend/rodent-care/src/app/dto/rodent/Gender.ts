export type Gender = 'male' | 'female' | 'unknown';

export const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Unknown', value: 'unknown' }
];
