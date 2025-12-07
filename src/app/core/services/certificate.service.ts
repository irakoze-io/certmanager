import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse } from '../models/api-response.model';
import {
  GenerateCertificateRequest,
  CertificateResponse,
  CertificateDownloadUrl,
  CertificateStatus
} from '../models/certificate.model';

@Injectable({
  providedIn: 'root'
})
export class CertificateService extends ApiService {
  private readonly endpoint = '/certificates';

  constructor(protected override http: HttpClient) {
    super(http);
  }

  /**
   * Generate a certificate (sync or async)
   */
  generateCertificate(request: GenerateCertificateRequest): Observable<CertificateResponse> {
    return new Observable(observer => {
      this.post<CertificateResponse>(this.endpoint, request).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to generate certificate'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get certificate by ID
   */
  getCertificateById(id: number): Observable<CertificateResponse> {
    return new Observable(observer => {
      this.get<CertificateResponse>(`${this.endpoint}/${id}`).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Certificate not found'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get certificate by certificate number
   */
  getCertificateByNumber(certificateNumber: string): Observable<CertificateResponse> {
    return new Observable(observer => {
      this.get<CertificateResponse>(`${this.endpoint}/number/${certificateNumber}`).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Certificate not found'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get all certificates with optional filters
   */
  getAllCertificates(filters?: {
    status?: CertificateStatus;
    templateId?: number;
    recipientEmail?: string;
  }): Observable<CertificateResponse[]> {
    return new Observable(observer => {
      this.get<CertificateResponse[]>(this.endpoint, filters).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(Array.isArray(response.data) ? response.data : [response.data]);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to fetch certificates'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Update certificate
   */
  updateCertificate(id: number, updates: Partial<CertificateResponse>): Observable<CertificateResponse> {
    return new Observable(observer => {
      this.put<CertificateResponse>(`${this.endpoint}/${id}`, updates).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to update certificate'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Delete certificate
   */
  deleteCertificate(id: number): Observable<void> {
    return new Observable(observer => {
      this.delete<void>(`${this.endpoint}/${id}`).subscribe({
        next: response => {
          if (response.success) {
            observer.next();
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to delete certificate'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Revoke certificate
   */
  revokeCertificate(id: number): Observable<CertificateResponse> {
    return new Observable(observer => {
      this.post<CertificateResponse>(`${this.endpoint}/${id}/revoke`, {}).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to revoke certificate'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get signed download URL for certificate
   */
  getDownloadUrl(id: number): Observable<CertificateDownloadUrl> {
    return new Observable(observer => {
      this.get<CertificateDownloadUrl>(`${this.endpoint}/${id}/download-url`).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to get download URL'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Verify certificate by hash (public endpoint - no tenant header required)
   */
  verifyCertificate(hash: string): Observable<CertificateResponse> {
    return new Observable(observer => {
      // This is a public endpoint, so we use the base URL without tenant header
      // The interceptor will still add the token if available, but tenant header is not required
      this.http.get<ApiResponse<CertificateResponse>>(`${this.apiUrl}/certificates/verify/${hash}`).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Certificate verification failed'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }
}
