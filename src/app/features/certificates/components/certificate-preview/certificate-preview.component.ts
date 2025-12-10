import { Component, OnInit, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CertificateService } from '../../../../core/services/certificate.service';
import { ToastService } from '../../../../core/services/toast.service';
import { CertificateResponse, CertificateStatus } from '../../../../core/models/certificate.model';
import { formatDate, formatTime } from '../../../../core/utils/date.util';

@Component({
  selector: 'app-certificate-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './certificate-preview.component.html',
  styleUrl: './certificate-preview.component.css'
})
export class CertificatePreviewComponent implements OnInit {
  certificate = input.required<CertificateResponse>();
  isOpen = input<boolean>(false);

  onClose = output<void>();

  CertificateStatus = CertificateStatus;
  formatDate = formatDate;
  formatTime = formatTime;
  Object = Object;

  isLoading = signal<boolean>(false);
  previewUrl = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  previewLoadAttempted = signal<boolean>(false);

  constructor(
    private certificateService: CertificateService,
    private toastService: ToastService
  ) {
    // Load preview URL when certificate changes
    effect(() => {
      const cert = this.certificate();
      const open = this.isOpen();
      if (cert && open && cert.status === CertificateStatus.PENDING) {
        this.loadPreviewUrl();
      }
    });
  }

  ngOnInit(): void {
    if (this.certificate() && this.isOpen()) {
      this.loadPreviewUrl();
    }
  }

  private loadPreviewUrl(): void {
    const cert = this.certificate();
    if (!cert || !cert.id) {
      return;
    }

    // Don't reload if we already attempted
    if (this.previewLoadAttempted()) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.previewLoadAttempted.set(true);

    this.certificateService.getDownloadUrl(cert.id, 10).subscribe({
      next: (url) => {
        if (url) {
          this.previewUrl.set(url);
        } else {
          this.previewUrl.set(null);
        }
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading preview URL:', error);
        this.isLoading.set(false);

        const status = error?.status || error?.error?.status;
        if (status === 404 || status === 400) {

          this.previewUrl.set(null);
        } else {
          // Other error - log but don't show error message
          this.previewUrl.set(null);
        }
      }
    });
  }

  isCertificateCleanedUp(): boolean {
    const cert = this.certificate();
    if (!cert) {
      return false;
    }

    // Check if storagePath is null/undefined and certificate is PENDING
    if (!cert.storagePath && cert.status === CertificateStatus.PENDING) {
      // Check if certificate was created more than 15 minutes ago
      if (cert.createdAt) {
        const createdAt = new Date(cert.createdAt);
        const now = new Date();
        const minutesDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        return minutesDiff > 15;
      }
    }
    return false;
  }

  copyCertificateNumber(): void {
    const certNumber = this.certificate()?.certificateNumber;
    if (!certNumber) {
      return;
    }

    navigator.clipboard.writeText(certNumber).then(() => {
      this.toastService.success('Certificate number copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.toastService.error('Failed to copy certificate number');
    });
  }

  close(): void {
    this.onClose.emit();
  }

  getStatusCircleClass(status: CertificateStatus): string {
    switch (status) {
      case CertificateStatus.ISSUED:
        return 'status-circle-green';
      case CertificateStatus.PENDING:
        return 'status-circle-yellow';
      case CertificateStatus.FAILED:
        return 'status-circle-red';
      case CertificateStatus.REVOKED:
        return 'status-circle-red';
      default:
        return 'status-circle-gray';
    }
  }

  formatFieldValue(value: any): string {
    if (value === null || value === undefined) {
      return '-';
    }
    if (typeof value === 'object') {
      // If it's an object, try to stringify it nicely or extract meaningful data
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      // For objects, try to get a meaningful string representation
      const keys = Object.keys(value);
      if (keys.length === 0) {
        return '-';
      }
      // If it has common properties, show them
      if (value.name) return value.name;
      if (value.value) return value.value;
      if (value.label) return value.label;
      
      return JSON.stringify(value);
    }
    return String(value);
  }
}
