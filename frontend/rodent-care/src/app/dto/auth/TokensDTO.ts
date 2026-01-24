import { UserResponse } from './UserResponse';

export interface TokensDto {
  success: boolean;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}