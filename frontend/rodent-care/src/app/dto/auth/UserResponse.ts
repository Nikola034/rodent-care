import { UserRole } from './UserRole';
import { UserStatus } from './UserStatus';

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface UsersListResponse {
  success: boolean;
  users: UserResponse[];
  total: number;
}

export interface AuthResponse {
  success: boolean;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export interface MessageResponse {
  success: boolean;
  message: string;
}
