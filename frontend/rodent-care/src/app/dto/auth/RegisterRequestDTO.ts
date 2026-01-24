import { UserRole } from './UserRole';

export interface RegisterRequestDto {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}
