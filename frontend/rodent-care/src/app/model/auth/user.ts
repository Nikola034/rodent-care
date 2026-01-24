import { UserRole } from '../../dto/auth/UserRole';
import { UserStatus } from '../../dto/auth/UserStatus';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}
