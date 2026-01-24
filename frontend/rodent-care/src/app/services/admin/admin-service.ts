// src/app/services/admin/admin-service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  CAUserResponseDTO, 
  CreateCAUserRequestDTO, 
  AdminCertificateRequestDTO 
} from '../../dto/admin/admin-dtos';
import { CertificateResponseDTO } from '../../dto/certificate/certificate-dtos';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly baseUrl = `${environment.apiUrl}admin`;

  constructor(private http: HttpClient) {}

  /**
   * Get all CA users
   */
  getCAUsers(): Observable<CAUserResponseDTO[]> {
    return this.http.get<CAUserResponseDTO[]>(`${this.baseUrl}/ca-users`);
  }

  /**
   * Get CA user by ID
   */
  getCAUser(id: number): Observable<CAUserResponseDTO> {
    return this.http.get<CAUserResponseDTO>(`${this.baseUrl}/ca-users/${id}`);
  }

  /**
   * Create new CA user
   */
  createCAUser(request: CreateCAUserRequestDTO): Observable<CAUserResponseDTO> {
    return this.http.post<CAUserResponseDTO>(`${this.baseUrl}/ca-users`, request);
  }

  /**
   * Issue CA certificate for a CA user
   */
  issueCACertificate(request: AdminCertificateRequestDTO): Observable<CertificateResponseDTO> {
    return this.http.post<CertificateResponseDTO>(`${this.baseUrl}/issue-ca-certificate`, request);
  }
}