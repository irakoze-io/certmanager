import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CertificateService } from '../../core/services/certificate.service';
import { ToastService } from '../../core/services/toast.service';
import { CertificateResponse, CertificateStatus } from '../../core/models/certificate.model';
import { DataGridComponent, DataGridConfig } from '../../shared/components/data-grid/data-grid.component';

@Component({
  selector: 'app-certificates-list',
  standalone: true,
  imports: [CommonModule, RouterModule, DataGridComponent],
  templateUrl: './certificates-list.component.html',
  styleUrl: './certificates-list.component.css'
})
export class CertificatesListComponent implements OnInit {
  certificates = signal<CertificateResponse[]>([]);
  isLoading = signal<boolean>(false);
  filteredCertificates = signal<CertificateResponse[]>([]);
  errorMessage = signal<string | null>(null);

  gridConfig: DataGridConfig = {
    title: 'Certificates',
    addButtonLabel: 'Add New Certificate',
    showCheckbox: true,
    showDateSelector: true,
    showSearch: true,
    showFilter: true,
    itemsPerPageOptions: [10, 25, 50, 100],
    defaultItemsPerPage: 10,
    columns: [
      { key: 'certificateNumber', label: 'Certificate Number', sortable: true },
      { key: 'recipientName', label: 'Recipient Name', sortable: true },
      { key: 'recipientEmail', label: 'Recipient Email', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'issuedAt', label: 'Issued', sortable: true }
    ],
    actions: [
      {
        label: 'Download',
        action: 'download',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>'
      },
      {
        label: 'View',
        action: 'view',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>'
      }
    ]
  };

  constructor(
    private certificateService: CertificateService,
    private toastService: ToastService,
    private router: Router
  ) {
    effect(() => {
      this.filteredCertificates.set(this.certificates());
    });
  }

  ngOnInit(): void {
    this.loadCertificates();
  }

  loadCertificates(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.certificateService.getAllCertificates().subscribe({
      next: (certificates) => {
        this.certificates.set(certificates);
        this.filteredCertificates.set(certificates);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading certificates:', error);
        this.errorMessage.set(error?.message || 'Failed to load certificates. Please try again.');
        this.isLoading.set(false);
        // Set empty array on error to show empty state
        this.certificates.set([]);
        this.filteredCertificates.set([]);
      }
    });
  }

  onSearch(query: string): void {
    if (!query.trim()) {
      this.filteredCertificates.set(this.certificates());
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = this.certificates().filter(cert => {
      const recipientName = cert.recipientData?.['name'] || '';
      const recipientEmail = cert.recipientData?.['email'] || '';
      return cert.certificateNumber.toLowerCase().includes(lowerQuery) ||
        recipientName.toLowerCase().includes(lowerQuery) ||
        recipientEmail.toLowerCase().includes(lowerQuery);
    });
    this.filteredCertificates.set(filtered);
  }

  onFilter(): void {
    console.log('Filter clicked');
  }

  onAdd(): void {
    console.log('Add certificate clicked');
  }

  onPageChange(page: number): void {
    // Handled by DataGridComponent
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    // Handled by DataGridComponent
  }

  onRowClick(certificate: CertificateResponse): void {
    console.log('Row clicked:', certificate);
  }

  onActionClick(event: { action: string; item: any }): void {
    const { action, item } = event;
    const certificate = item._original || item;
    
    switch (action) {
      case 'download':
        this.downloadCertificate(certificate);
        break;
      case 'view':
        // Navigate to certificate view (could open modal or navigate to route)
        // For now, just log - can be enhanced to open modal similar to dashboard
        console.log('View certificate:', certificate);
        // TODO: Implement view functionality (open modal or navigate)
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  downloadCertificate(certificate: CertificateResponse): void {
    if (certificate.status !== CertificateStatus.ISSUED) {
      this.toastService.warning('Certificate is not ready for download. Status: ' + certificate.status);
      return;
    }
    
    if (!certificate.id) {
      this.toastService.error('Invalid certificate data.');
      return;
    }
    
    this.certificateService.getDownloadUrl(certificate.id, 60).subscribe({
      next: (url) => {
        window.open(url, '_blank');
      },
      error: (error) => {
        console.error('Failed to get download URL:', error);
        let errorMsg = 'Failed to get download URL.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.toastService.error(errorMsg);
      }
    });
  }

  formatCertificateData(certificates: CertificateResponse[]): any[] {
    return certificates.map(cert => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientData?.['name'] || '-',
      recipientEmail: cert.recipientData?.['email'] || '-',
      status: cert.status,
      issuedAt: cert.issuedAt || '-',
      // Keep original for actions
      _original: cert
    }));
  }
}

