/**
 * Certificate models matching backend DTOs
 */

export interface GenerateCertificateRequest {
  templateVersionId: number;
  recipientName: string;
  recipientEmail: string;
  data: Record<string, unknown>;
  async?: boolean;
}

export interface CertificateResponse {
  id: number;
  certificateNumber: string;
  templateId: number;
  templateVersionId: number;
  recipientName: string;
  recipientEmail: string;
  status: CertificateStatus;
  pdfUrl?: string;
  hash?: string;
  qrCodeUrl?: string;
  issuedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export enum CertificateStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  ISSUED = 'ISSUED',
  FAILED = 'FAILED',
  REVOKED = 'REVOKED'
}

export interface CertificateDownloadUrl {
  downloadUrl: string;
  expiresAt: string;
}
