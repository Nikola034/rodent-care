import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActivityLogsResponse,
  MessageResponse,
  UpdateUserRoleRequest,
  UpdateUserStatusRequest,
  UserResponse,
  UsersListResponse
} from '../../dto/auth';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = `${environment.apiUrl}users`;

  constructor(private http: HttpClient) {}

  /**
   * Get current user profile
   */
  getCurrentUser(): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/me`).pipe(
      catchError((error) => {
        console.error('Failed to get current user:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * List all users (admin only)
   */
  listUsers(): Observable<UsersListResponse> {
    return this.http.get<UsersListResponse>(this.baseUrl).pipe(
      catchError((error) => {
        console.error('Failed to list users:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get user by ID (admin only)
   */
  getUser(id: string): Observable<UserResponse> {
    return this.http.get<UserResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Failed to get user:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update user role (admin only)
   */
  updateUserRole(id: string, request: UpdateUserRoleRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}/role`, request).pipe(
      catchError((error) => {
        console.error('Failed to update user role:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update user status (admin only)
   */
  updateUserStatus(id: string, request: UpdateUserStatusRequest): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${this.baseUrl}/${id}/status`, request).pipe(
      catchError((error) => {
        console.error('Failed to update user status:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete user (admin only)
   */
  deleteUser(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Failed to delete user:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get user activity logs (admin only)
   */
  getUserActivityLogs(id: string): Observable<ActivityLogsResponse> {
    return this.http.get<ActivityLogsResponse>(`${this.baseUrl}/${id}/activity-logs`).pipe(
      catchError((error) => {
        console.error('Failed to get activity logs:', error);
        return throwError(() => error);
      })
    );
  }
}
