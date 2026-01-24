export type Species =
  | 'beaver'
  | 'capybara'
  | 'nutria'
  | 'guinea_pig'
  | 'muskrat'
  | 'hamster'
  | 'prairie_dog'
  | 'rabbit';

export const SPECIES_OPTIONS: { label: string; value: Species }[] = [
  { label: 'Beaver', value: 'beaver' },
  { label: 'Capybara', value: 'capybara' },
  { label: 'Nutria', value: 'nutria' },
  { label: 'Guinea Pig', value: 'guinea_pig' },
  { label: 'Muskrat', value: 'muskrat' },
  { label: 'Hamster', value: 'hamster' },
  { label: 'Prairie Dog', value: 'prairie_dog' },
  { label: 'Rabbit', value: 'rabbit' }
];
