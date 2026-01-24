import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoginRequest } from '../../dto/auth/LoginRequest';
import { BehaviorSubject, catchError, Observable, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokensDto } from '../../dto/auth/TokensDTO';
import { RegisterRequestDto } from '../../dto/auth/RegisterRequestDTO';
import { RegisterResponseDto } from '../../dto/auth/RegisterResponseDTO';
import { RefreshTokenDto } from '../../dto/auth/RefreshTokenDTO';
import { User } from '../../model/auth/user';
import { UserRole } from '../../dto/auth/UserRole';

export interface StringBody {
  message: string;
}

export interface DecodedToken {
  sub: string;
  exp: number;
  iat: number;
  username?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'rodent_care_tokens';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state from stored tokens
   */
  private initializeAuth(): void {
    const tokens = this.getStoredTokens();

    if (tokens && this.isTokenValid(tokens.access_token)) {
      this.isAuthenticatedSubject.next(true);
      if (tokens.user) {
        this.currentUserSubject.next(tokens.user);
      }
    } else {
      this.clearAuthData();
    }
  }

  /**
   * Login user with username and password
   */
  login(credentials: LoginRequest): Observable<TokensDto> {
    return this.http
      .post<TokensDto>(`${environment.apiUrl}auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.handleLoginSuccess(response);
        }),
        catchError((error) => {
          console.error('Login failed:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Register new user
   */
  register(userData: RegisterRequestDto): Observable<RegisterResponseDto> {
    return this.http
      .post<RegisterResponseDto>(`${environment.apiUrl}auth/register`, userData)
      .pipe(
        catchError((error) => {
          console.error('Registration failed:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Handle successful login response
   */
  private handleLoginSuccess(response: TokensDto): void {
    // Store tokens
    localStorage.setItem(this.TOKEN_KEY, JSON.stringify(response));

    // Update subjects
    this.isAuthenticatedSubject.next(true);
    if (response.user) {
      this.currentUserSubject.next(response.user);
    }

    // Redirect to dashboard
    this.router.navigate(['/app']);
  }

  /**
   * Logout user and clear all stored data
   */
  logout(): void {
    // Call backend logout endpoint
    this.http.post(`${environment.apiUrl}auth/logout`, {}).subscribe({
      complete: () => {
        this.clearAuthData();
        this.router.navigate(['']);
      },
      error: () => {
        this.clearAuthData();
        this.router.navigate(['']);
      }
    });
  }

  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  /**
   * Get access token for API requests
   */
  getAccessToken(): string | null {
    const tokens = this.getStoredTokens();
    return tokens?.access_token || null;
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    const tokens = this.getStoredTokens();
    return tokens?.refresh_token || null;
  }

  /**
   * Get stored tokens from localStorage
   */
  private getStoredTokens(): TokensDto | null {
    try {
      const tokens = localStorage.getItem(this.TOKEN_KEY);
      return tokens ? JSON.parse(tokens) : null;
    } catch (error) {
      console.error('Error parsing stored tokens:', error);
      return null;
    }
  }

  /**
   * Check if token is valid (not expired)
   */
  isTokenValid(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp > currentTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * Decode JWT token
   */
  private decodeToken(token: string): DecodedToken {
    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload);
      return JSON.parse(decodedPayload);
    } catch (error) {
      throw new Error('Invalid token format');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const tokens = this.getStoredTokens();
    return !!(tokens && this.isTokenValid(tokens.access_token));
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get current user from stored tokens
   */
  getStoredUser(): User | null {
    const tokens = this.getStoredTokens();
    return tokens?.user || null;
  }

  /**
   * Refresh tokens using refresh token
   */
  refreshTokens(): Observable<RefreshTokenDto> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http
      .post<RefreshTokenDto>(
        `${environment.apiUrl}auth/refresh`,
        { refresh_token: refreshToken }
      )
      .pipe(
        tap((tokens) => {
          // Update only the tokens, keep the user info
          const currentTokens = this.getStoredTokens();
          const updatedTokens = {
            ...currentTokens,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_in: tokens.expires_in
          };
          localStorage.setItem(this.TOKEN_KEY, JSON.stringify(updatedTokens));
        }),
        catchError((error) => {
          console.error('Token refresh failed:', error);
          this.clearAuthData();
          this.router.navigate(['']);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(): Date | null {
    const accessToken = this.getAccessToken();
    if (!accessToken) return null;

    try {
      const decoded = this.decodeToken(accessToken);
      return new Date(decoded.exp * 1000);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if token expires soon (within 5 minutes)
   */
  shouldRefreshToken(): boolean {
    const expiration = this.getTokenExpiration();
    if (!expiration) return false;

    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return expiration <= fiveMinutesFromNow;
  }

  /**
   * Check if user is a Volunteer
   */
  isVolunteer(): boolean {
    return this.getRoleFromToken() === 'volunteer';
  }

  /**
   * Check if user is a Caretaker
   */
  isCaretaker(): boolean {
    return this.getRoleFromToken() === 'caretaker';
  }

  /**
   * Check if user is a Veterinarian
   */
  isVeterinarian(): boolean {
    return this.getRoleFromToken() === 'veterinarian';
  }

  /**
   * Check if user is an Admin
   */
  isAdmin(): boolean {
    return this.getRoleFromToken() === 'admin';
  }

  /**
   * Check if user can manage rodents (admin, caretaker, veterinarian)
   */
  canManageRodents(): boolean {
    const role = this.getRoleFromToken();
    return role === 'admin' || role === 'caretaker' || role === 'veterinarian';
  }

  /**
   * Check if user can manage medical records (admin, veterinarian)
   */
  canManageMedicalRecords(): boolean {
    const role = this.getRoleFromToken();
    return role === 'admin' || role === 'veterinarian';
  }

  /**
   * Check if user can view data (all authenticated users)
   */
  canView(): boolean {
    return this.isAuthenticated();
  }

  /**
   * Get role from token
   */
  getRoleFromToken(): UserRole | undefined {
    const tokens = this.getStoredTokens();
    if (tokens?.access_token) {
      try {
        const tokenInfo = this.decodeToken(tokens.access_token);
        return tokenInfo.role as UserRole;
      } catch {
        return undefined;
      }
    }
    // Fallback to stored user role
    if (tokens?.user?.role) {
      return tokens.user.role;
    }
    return undefined;
  }

  /**
   * Get username from token
   */
  getUsernameFromToken(): string | undefined {
    const tokens = this.getStoredTokens();
    if (tokens?.access_token) {
      try {
        const tokenInfo = this.decodeToken(tokens.access_token);
        return tokenInfo.username;
      } catch {
        return undefined;
      }
    }
    return tokens?.user?.username;
  }
}
