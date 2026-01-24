// src/app/services/certificate/certificate.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  CertificateRequestDTO, 
  CertificateResponseDTO, 
  CertificateListDTO, 
  CSRRequestDTO,
  RevocationRequestDTO,
  KeystoreDownloadDTO,
  TemplateRequestDTO,
  TemplateResponseDTO
} from '../../dto/certificate/certificate-dtos';

@Injectable({
  providedIn: 'root'
})
export class CertificateService {
  private readonly baseUrl = `${environment.apiUrl}certificates`;

  constructor(private http: HttpClient) {}

  /**
   * Issue a new certificate
   */
  issueCertificate(request: CertificateRequestDTO): Observable<CertificateResponseDTO> {
    return this.http.post<CertificateResponseDTO>(`${this.baseUrl}/issue`, request);
  }

  /**
   * Process Certificate Signing Request (CSR)
   */
  processCSR(request: CSRRequestDTO): Observable<CertificateResponseDTO> {
    return this.http.post<CertificateResponseDTO>(`${this.baseUrl}/csr`, request);
  }

  /**
   * Get all certificates accessible to current user
   */
  getCertificates(): Observable<CertificateListDTO[]> {
    return this.http.get<CertificateListDTO[]>(this.baseUrl);
  }

  /**
   * Get all certificates not revoked
   */
  getAllCertificates(): Observable<CertificateListDTO[]> {
    return this.http.get<CertificateListDTO[]>(`${this.baseUrl}/all`);
  }

  /**
   * Get specific certificate details
   */
  getCertificate(id: number): Observable<CertificateResponseDTO> {
    return this.http.get<CertificateResponseDTO>(`${this.baseUrl}/${id}`);
  }

  /**
   * Revoke certificate
   */
  revokeCertificate(request: RevocationRequestDTO): Observable<string> {
    return this.http.post(`${this.baseUrl}/${request.certificateId}/revoke`, request, {
      responseType: 'text'
    });
  }

  /**
   * Download certificate as keystore (PKCS12/JKS)
   */
  downloadKeystore(request: KeystoreDownloadDTO): Observable<Blob> {
    return this.http.post(`${this.baseUrl}/${request.certificateId}/keystore`, request, {
      responseType: 'blob'
    });
  }

  /**
   * Download certificate only (no private key)
   */
  downloadCertificate(certificateId: number, keystoreType: string = 'PKCS12', 
                     password: string = 'certificate', alias: string = 'cert'): Observable<Blob> {
    const params = new HttpParams()
      .set('keystoreType', keystoreType)
      .set('password', password)
      .set('alias', alias);

    return this.http.get(`${this.baseUrl}/${certificateId}/download`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Get available CA certificates for signing
   */
  getAvailableCACertificates(): Observable<CertificateListDTO[]> {
    return this.http.get<CertificateListDTO[]>(`${this.baseUrl}/ca-certificates`);
  }

  /**
   * Create certificate template
   */
  createTemplate(request: TemplateRequestDTO): Observable<TemplateResponseDTO> {
    return this.http.post<TemplateResponseDTO>(`${this.baseUrl}/templates`, request);
  }

  /**
   * Get available templates
   */
  getTemplates(): Observable<TemplateResponseDTO[]> {
    return this.http.get<TemplateResponseDTO[]>(`${this.baseUrl}/templates`);
  }

  /**
   * Get template details
   */
  getTemplate(id: number): Observable<TemplateResponseDTO> {
    return this.http.get<TemplateResponseDTO>(`${this.baseUrl}/templates/${id}`);
  }

  /**
   * Create truststore with multiple CA certificates
   */
  createTruststore(certificateIds: number[], keystoreType: string = 'PKCS12', 
                   password: string = 'truststore'): Observable<Blob> {
    const params = new HttpParams()
      .set('keystoreType', keystoreType)
      .set('password', password);

    return this.http.post(`${this.baseUrl}/truststore`, certificateIds, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Helper method to download blob as file
   */
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}