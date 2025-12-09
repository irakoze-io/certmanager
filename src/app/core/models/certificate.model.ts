/**
 * Certificate models matching backend DTOs
 */

export interface GenerateCertificateRequest {
  templateVersionId: string; // UUID
  certificateNumber?: string | null;
  recipientData: Record<string, any>; // Must match fieldSchema from template version
  metadata?: Record<string, any>;
  issuedAt?: string | null; // ISO datetime
  expiresAt?: string | null; // ISO datetime
  issuedBy?: string | null; // UUID
  synchronous?: boolean; // Default: false (async)
}

export interface CertificateResponse {
  id: string; // UUID
  certificateNumber: string;
  status: CertificateStatus;
  templateVersionId: string;
  recipientData: Record<string, any>;
  metadata?: Record<string, any>;
  storagePath?: string; // Only when ISSUED
  signedHash?: string; // Only when ISSUED
  qrCodeUrl?: string; // Only when ISSUED
  issuedAt?: string;
  expiresAt?: string;
  issuedBy?: string; // UUID of user who issued the certificate
  issuedByName?: string; // Name of user who issued the certificate
  customerId?: number;
  createdAt: string;
  updatedAt?: string;
}

export enum CertificateStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  ISSUED = 'ISSUED',
  FAILED = 'FAILED',
  REVOKED = 'REVOKED'
}

export interface CertificateDownloadUrlResponse {
  downloadUrl: string;
}
