import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DailyRecordListResponse,
  SingleDailyRecordResponse,
  CreateDailyRecordRequest,
  UpdateDailyRecordRequest,
  DailyRecordQueryParams,
  ActivityListResponse,
  SingleActivityResponse,
  CreateActivityRequest,
  ActivityQueryParams,
  FeedingRecordListResponse,
  SingleFeedingRecordResponse,
  CreateFeedingRecordRequest,
  UpdateFeedingRecordRequest,
  FeedingQueryParams,
  DailySummaryResponse
} from '../../dto/activity';
import { MessageResponse } from '../../dto/auth/UserResponse';

@Injectable({
  providedIn: 'root'
})
export class ActivityTrackingService {
  private readonly baseUrl = `${environment.apiUrl}activities/rodents`;

  constructor(private http: HttpClient) {}

  // ==================== Daily Records ====================

  /**
   * List daily records for a rodent
   */
  listDailyRecords(
    rodentId: string,
    params?: DailyRecordQueryParams
  ): Observable<DailyRecordListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http
      .get<DailyRecordListResponse>(`${this.baseUrl}/${rodentId}/daily-records`, { params: httpParams })
      .pipe(
        catchError((error) => {
          console.error('Failed to list daily records:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Get a single daily record
   */
  getDailyRecord(rodentId: string, recordId: string): Observable<SingleDailyRecordResponse> {
    return this.http
      .get<SingleDailyRecordResponse>(`${this.baseUrl}/${rodentId}/daily-records/${recordId}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to get daily record:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create a daily record
   */
  createDailyRecord(
    rodentId: string,
    request: CreateDailyRecordRequest
  ): Observable<SingleDailyRecordResponse> {
    return this.http
      .post<SingleDailyRecordResponse>(`${this.baseUrl}/${rodentId}/daily-records`, request)
      .pipe(
        catchError((error) => {
          console.error('Failed to create daily record:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update a daily record
   */
  updateDailyRecord(
    rodentId: string,
    recordId: string,
    request: UpdateDailyRecordRequest
  ): Observable<SingleDailyRecordResponse> {
    return this.http
      .put<SingleDailyRecordResponse>(`${this.baseUrl}/${rodentId}/daily-records/${recordId}`, request)
      .pipe(
        catchError((error) => {
          console.error('Failed to update daily record:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a daily record
   */
  deleteDailyRecord(rodentId: string, recordId: string): Observable<MessageResponse> {
    return this.http
      .delete<MessageResponse>(`${this.baseUrl}/${rodentId}/daily-records/${recordId}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to delete daily record:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Activities ====================

  /**
   * List activities for a rodent
   */
  listActivities(
    rodentId: string,
    params?: ActivityQueryParams
  ): Observable<ActivityListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.activity_type) httpParams = httpParams.set('activity_type', params.activity_type);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http
      .get<ActivityListResponse>(`${this.baseUrl}/${rodentId}/activities`, { params: httpParams })
      .pipe(
        catchError((error) => {
          console.error('Failed to list activities:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create an activity
   */
  createActivity(
    rodentId: string,
    request: CreateActivityRequest
  ): Observable<SingleActivityResponse> {
    return this.http
      .post<SingleActivityResponse>(`${this.baseUrl}/${rodentId}/activities`, request)
      .pipe(
        catchError((error) => {
          console.error('Failed to create activity:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete an activity
   */
  deleteActivity(rodentId: string, activityId: string): Observable<MessageResponse> {
    return this.http
      .delete<MessageResponse>(`${this.baseUrl}/${rodentId}/activities/${activityId}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to delete activity:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Feeding Records ====================

  /**
   * List feeding records for a rodent
   */
  listFeedingRecords(
    rodentId: string,
    params?: FeedingQueryParams
  ): Observable<FeedingRecordListResponse> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.food_type) httpParams = httpParams.set('food_type', params.food_type);
      if (params.start_date) httpParams = httpParams.set('start_date', params.start_date);
      if (params.end_date) httpParams = httpParams.set('end_date', params.end_date);
      if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
      if (params.limit !== undefined) httpParams = httpParams.set('limit', params.limit.toString());
    }

    return this.http
      .get<FeedingRecordListResponse>(`${this.baseUrl}/${rodentId}/feeding-records`, { params: httpParams })
      .pipe(
        catchError((error) => {
          console.error('Failed to list feeding records:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Create a feeding record
   */
  createFeedingRecord(
    rodentId: string,
    request: CreateFeedingRecordRequest
  ): Observable<SingleFeedingRecordResponse> {
    return this.http
      .post<SingleFeedingRecordResponse>(`${this.baseUrl}/${rodentId}/feeding-records`, request)
      .pipe(
        catchError((error) => {
          console.error('Failed to create feeding record:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Update a feeding record
   */
  updateFeedingRecord(
    rodentId: string,
    recordId: string,
    request: UpdateFeedingRecordRequest
  ): Observable<SingleFeedingRecordResponse> {
    return this.http
      .put<SingleFeedingRecordResponse>(`${this.baseUrl}/${rodentId}/feeding-records/${recordId}`, request)
      .pipe(
        catchError((error) => {
          console.error('Failed to update feeding record:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Delete a feeding record
   */
  deleteFeedingRecord(rodentId: string, recordId: string): Observable<MessageResponse> {
    return this.http
      .delete<MessageResponse>(`${this.baseUrl}/${rodentId}/feeding-records/${recordId}`)
      .pipe(
        catchError((error) => {
          console.error('Failed to delete feeding record:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Daily Summary ====================

  /**
   * Get daily summary for a rodent on a specific date
   * @param rodentId - The rodent ID
   * @param date - Date in YYYY-MM-DD format (local date)
   * @param tzOffset - Timezone offset in minutes (e.g., -60 for UTC+1)
   */
  getDailySummary(rodentId: string, date: string, tzOffset?: number): Observable<DailySummaryResponse> {
    let params = new HttpParams();
    if (tzOffset !== undefined) {
      params = params.set('tz_offset', tzOffset.toString());
    }
    return this.http
      .get<DailySummaryResponse>(`${this.baseUrl}/${rodentId}/summary/${date}`, { params })
      .pipe(
        catchError((error) => {
          console.error('Failed to get daily summary:', error);
          return throwError(() => error);
        })
      );
  }
}
