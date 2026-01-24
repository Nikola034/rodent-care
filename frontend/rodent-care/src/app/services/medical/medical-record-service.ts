import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateMedicalRecordRequest,
  MedicalRecordListResponse,
  MedicalRecordQueryParams,
  SingleMedicalRecordResponse,
  UpdateMedicalRecordRequest
} from '../../dto/medical';
import { MessageResponse } from '../../dto/auth/UserResponse';

@Injectable({
  providedIn: 'root'
})
export class MedicalRecordService {
  private readonly baseUrl = `${environment.apiUrl}rodents`;

  constructor(private http: HttpClient) {}

  /**
   * List medical records for a rodent
   */
  listMedicalRecords(
    rodentId: string,
    params?: MedicalRecordQueryParams
  ): Observable<MedicalRecordListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.record_type) httpParams = httpParams.set('record_type', params.record_type);
      if (params.from_date) httpParams = httpParams.set('from_date', params.from_date);
      if (params.to_date) httpParams = httpParams.set('to_date', params.to_date);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http
      .get<MedicalRecordListResponse>(`${this.baseUrl}/${rodentId}/medical-records`, { params: httpParams })
      .pipe(
        catchError((error) => {
          console.error('Failed to list medical records:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a single medical record
   */
  getMedicalRecord(rodentId: string, recordId: string): Observable<SingleMedicalRecordResponse> {
    return this.http
      .get<SingleMedicalRecordResponse>(`${this.baseUrl}/${rodentId}/medical-records/${recordId}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to get medical record:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create a medical record
   */
  createMedicalRecord(
    rodentId: string,
    request: CreateMedicalRecordRequest
  ): Observable<SingleMedicalRecordResponse> {
    return this.http
      .post<SingleMedicalRecordResponse>(`${this.baseUrl}/${rodentId}/medical-records`, request)
      .pipe(
        catchError((error) => {
          console.error('Failed to create medical record:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update a medical record
   */
  updateMedicalRecord(
    rodentId: string,
    recordId: string,
    request: UpdateMedicalRecordRequest
  ): Observable<SingleMedicalRecordResponse> {
    return this.http
      .put<SingleMedicalRecordResponse>(`${this.baseUrl}/${rodentId}/medical-records/${recordId}`, request)
      .pipe(
        catchError((error) => {
          console.error('Failed to update medical record:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a medical record
   */
  deleteMedicalRecord(rodentId: string, recordId: string): Observable<MessageResponse> {
    return this.http
      .delete<MessageResponse>(`${this.baseUrl}/${rodentId}/medical-records/${recordId}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to delete medical record:', error);
          return throwError(() => error);
        })
      );
  }
}
