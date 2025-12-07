import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CertificateService } from '../../core/services/certificate.service';
import { CertificateResponse } from '../../core/models/certificate.model';
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
    ]
  };

  constructor(
    private certificateService: CertificateService,
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
    const filtered = this.certificates().filter(cert =>
      cert.certificateNumber.toLowerCase().includes(lowerQuery) ||
      cert.recipientName.toLowerCase().includes(lowerQuery) ||
      cert.recipientEmail.toLowerCase().includes(lowerQuery)
    );
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

  onActionClick(event: { action: string; item: CertificateResponse }): void {
    console.log('Action clicked:', event);
  }

  formatCertificateData(certificates: CertificateResponse[]): any[] {
    return certificates.map(cert => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      status: cert.status,
      issuedAt: cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '-',
      // Keep original for actions
      _original: cert
    }));
  }
}

