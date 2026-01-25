import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PopulationStatsResponse,
  HealthAnalyticsResponse,
  ActivityAnalyticsResponse,
  FeedingAnalyticsResponse,
  DashboardSummaryResponse,
  TrendDataResponse,
  AnalyticsQueryParams,
  ExportQueryParams
} from '../../dto/analytics';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly baseUrl = `${environment.apiUrl}analytics`;

  constructor(private http: HttpClient) {}

  private buildParams(params?: AnalyticsQueryParams): HttpParams {
    let httpParams = new HttpParams();
    if (params) {
      if (params.from_date) httpParams = httpParams.set('from_date', params.from_date);
      if (params.to_date) httpParams = httpParams.set('to_date', params.to_date);
      if (params.species) httpParams = httpParams.set('species', params.species);
      if (params.period) httpParams = httpParams.set('period', params.period);
    }
    return httpParams;
  }

  // ==================== Dashboard ====================

  getDashboardSummary(): Observable<DashboardSummaryResponse> {
    return this.http
      .get<DashboardSummaryResponse>(`${this.baseUrl}/dashboard`)
      .pipe(
        catchError((error) => {
          console.error('Failed to get dashboard summary:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Population Statistics ====================

  getPopulationStats(params?: AnalyticsQueryParams): Observable<PopulationStatsResponse> {
    return this.http
      .get<PopulationStatsResponse>(`${this.baseUrl}/population`, { params: this.buildParams(params) })
      .pipe(
        catchError((error) => {
          console.error('Failed to get population stats:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Health Analytics ====================

  getHealthAnalytics(params?: AnalyticsQueryParams): Observable<HealthAnalyticsResponse> {
    return this.http
      .get<HealthAnalyticsResponse>(`${this.baseUrl}/health`, { params: this.buildParams(params) })
      .pipe(
        catchError((error) => {
          console.error('Failed to get health analytics:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Activity Analytics ====================

  getActivityAnalytics(params?: AnalyticsQueryParams): Observable<ActivityAnalyticsResponse> {
    return this.http
      .get<ActivityAnalyticsResponse>(`${this.baseUrl}/activity`, { params: this.buildParams(params) })
      .pipe(
        catchError((error) => {
          console.error('Failed to get activity analytics:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Feeding Analytics ====================

  getFeedingAnalytics(params?: AnalyticsQueryParams): Observable<FeedingAnalyticsResponse> {
    return this.http
      .get<FeedingAnalyticsResponse>(`${this.baseUrl}/feeding`, { params: this.buildParams(params) })
      .pipe(
        catchError((error) => {
          console.error('Failed to get feeding analytics:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Trend Data ====================

  getWeightTrends(params?: AnalyticsQueryParams): Observable<TrendDataResponse> {
    return this.http
      .get<TrendDataResponse>(`${this.baseUrl}/trends/weight`, { params: this.buildParams(params) })
      .pipe(
        catchError((error) => {
          console.error('Failed to get weight trends:', error);
          return throwError(() => error);
        })
      );
  }

  getActivityTrends(params?: AnalyticsQueryParams): Observable<TrendDataResponse> {
    return this.http
      .get<TrendDataResponse>(`${this.baseUrl}/trends/activity`, { params: this.buildParams(params) })
      .pipe(
        catchError((error) => {
          console.error('Failed to get activity trends:', error);
          return throwError(() => error);
        })
      );
  }

  getFeedingTrends(params?: AnalyticsQueryParams): Observable<TrendDataResponse> {
    return this.http
      .get<TrendDataResponse>(`${this.baseUrl}/trends/feeding`, { params: this.buildParams(params) })
      .pipe(
        catchError((error) => {
          console.error('Failed to get feeding trends:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Export ====================

  exportPopulationCsv(params?: ExportQueryParams): Observable<string> {
    let httpParams = new HttpParams();
    if (params) {
      httpParams = httpParams.set('format', params.format);
      if (params.from_date) httpParams = httpParams.set('from_date', params.from_date);
      if (params.to_date) httpParams = httpParams.set('to_date', params.to_date);
      if (params.species) httpParams = httpParams.set('species', params.species);
    }

    return this.http
      .get(`${this.baseUrl}/export/population`, { params: httpParams, responseType: 'text' })
      .pipe(
        catchError((error) => {
          console.error('Failed to export population data:', error);
          return throwError(() => error);
        })
      );
  }

  exportActivityCsv(params?: ExportQueryParams): Observable<string> {
    let httpParams = new HttpParams();
    if (params) {
      httpParams = httpParams.set('format', params.format);
      if (params.from_date) httpParams = httpParams.set('from_date', params.from_date);
      if (params.to_date) httpParams = httpParams.set('to_date', params.to_date);
    }

    return this.http
      .get(`${this.baseUrl}/export/activity`, { params: httpParams, responseType: 'text' })
      .pipe(
        catchError((error) => {
          console.error('Failed to export activity data:', error);
          return throwError(() => error);
        })
      );
  }

  exportFeedingCsv(params?: ExportQueryParams): Observable<string> {
    let httpParams = new HttpParams();
    if (params) {
      httpParams = httpParams.set('format', params.format);
      if (params.from_date) httpParams = httpParams.set('from_date', params.from_date);
      if (params.to_date) httpParams = httpParams.set('to_date', params.to_date);
    }

    return this.http
      .get(`${this.baseUrl}/export/feeding`, { params: httpParams, responseType: 'text' })
      .pipe(
        catchError((error) => {
          console.error('Failed to export feeding data:', error);
          return throwError(() => error);
        })
      );
  }

  // ==================== Helper Methods ====================

  downloadCsv(data: string, filename: string): void {
    const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
