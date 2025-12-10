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

    this.isLoading.set(true);
    this.errorMessage.set(null);

    // Try to get download URL for preview (10 minute expiration)
    // Note: PENDING certificates might not have a download URL yet
    this.certificateService.getDownloadUrl(cert.id, 10).subscribe({
      next: (url) => {
        this.previewUrl.set(url);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading preview URL:', error);
        this.isLoading.set(false);
        // Don't set error message - just don't show preview
        // PENDING certificates might not have a download URL yet, which is expected
        this.previewUrl.set(null);
      }
    });
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

  getStatusClass(status: CertificateStatus): string {
    switch (status) {
      case CertificateStatus.ISSUED:
        return 'bg-green-50 text-green-700 border-green-100';
      case CertificateStatus.PENDING:
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case CertificateStatus.FAILED:
        return 'bg-red-50 text-red-700 border-red-100';
      case CertificateStatus.REVOKED:
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }
}
