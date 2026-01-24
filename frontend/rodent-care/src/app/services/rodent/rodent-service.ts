import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateRodentRequest,
  ImageUploadResponse,
  RodentListResponse,
  RodentQueryParams,
  SingleRodentResponse,
  StatusHistoryListResponse,
  UpdateRodentRequest,
  UpdateRodentStatusRequest
} from '../../dto/rodent';
import { MessageResponse } from '../../dto/auth/UserResponse';

@Injectable({
  providedIn: 'root'
})
export class RodentService {
  private readonly baseUrl = `${environment.apiUrl}rodents`;

  constructor(private http: HttpClient) {}

  /**
   * List rodents with optional filtering and pagination
   */
  listRodents(params?: RodentQueryParams): Observable<RodentListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.species) httpParams = httpParams.set('species', params.species);
      if (params.status) httpParams = httpParams.set('status', params.status);
      if (params.name) httpParams = httpParams.set('name', params.name);
      if (params.chip_id) httpParams = httpParams.set('chip_id', params.chip_id);
      if (params.sort_by) httpParams = httpParams.set('sort_by', params.sort_by);
      if (params.sort_order) httpParams = httpParams.set('sort_order', params.sort_order);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http.get<RodentListResponse>(this.baseUrl, { params: httpParams }).pipe(
      catchError((error) => {
        console.error('Failed to list rodents:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a single rodent by ID
   */
  getRodent(id: string): Observable<SingleRodentResponse> {
    return this.http.get<SingleRodentResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Failed to get rodent:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Create a new rodent
   */
  createRodent(request: CreateRodentRequest): Observable<SingleRodentResponse> {
    return this.http.post<SingleRodentResponse>(this.baseUrl, request).pipe(
      catchError((error) => {
        console.error('Failed to create rodent:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update a rodent
   */
  updateRodent(id: string, request: UpdateRodentRequest): Observable<SingleRodentResponse> {
    return this.http.put<SingleRodentResponse>(`${this.baseUrl}/${id}`, request).pipe(
      catchError((error) => {
        console.error('Failed to update rodent:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update rodent status
   */
  updateRodentStatus(id: string, request: UpdateRodentStatusRequest): Observable<SingleRodentResponse> {
    return this.http.put<SingleRodentResponse>(`${this.baseUrl}/${id}/status`, request).pipe(
      catchError((error) => {
        console.error('Failed to update rodent status:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a rodent
   */
  deleteRodent(id: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/${id}`).pipe(
      catchError((error) => {
        console.error('Failed to delete rodent:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get rodent status history
   */
  getStatusHistory(id: string): Observable<StatusHistoryListResponse> {
    return this.http.get<StatusHistoryListResponse>(`${this.baseUrl}/${id}/status-history`).pipe(
      catchError((error) => {
        console.error('Failed to get status history:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Upload an image for a rodent
   */
  uploadImage(rodentId: string, file: File): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<ImageUploadResponse>(`${this.baseUrl}/${rodentId}/images`, formData).pipe(
      catchError((error) => {
        console.error('Failed to upload image:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete a rodent image
   */
  deleteImage(rodentId: string, imageId: string): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/${rodentId}/images/${imageId}`).pipe(
      catchError((error) => {
        console.error('Failed to delete image:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Set an image as primary
   */
  setPrimaryImage(rodentId: string, imageId: string): Observable<MessageResponse> {
    return this.http.put<MessageResponse>(`${this.baseUrl}/${rodentId}/images/${imageId}/primary`, {}).pipe(
      catchError((error) => {
        console.error('Failed to set primary image:', error);
        return throwError(() => error);
      })
    );
  }
}
