import { UserResponse } from './UserResponse';

export interface RegisterResponseDto {
  success: boolean;
  message: string;
  user: UserResponse;
}
