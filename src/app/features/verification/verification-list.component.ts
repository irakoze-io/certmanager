import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { CertificateService } from '../../core/services/certificate.service';
import { CertificateResponse } from '../../core/models/certificate.model';
import { DataGridComponent, DataGridConfig } from '../../shared/components/data-grid/data-grid.component';

@Component({
  selector: 'app-verification-list',
  standalone: true,
  imports: [CommonModule, RouterModule, DataGridComponent],
  templateUrl: './verification-list.component.html',
  styleUrl: './verification-list.component.css'
})
export class VerificationListComponent implements OnInit {
  verifications = signal<CertificateResponse[]>([]);
  isLoading = signal<boolean>(false);
  filteredVerifications = signal<CertificateResponse[]>([]);
  errorMessage = signal<string | null>(null);

  gridConfig: DataGridConfig = {
    title: 'Verification',
    addButtonLabel: 'Verify Certificate',
    showCheckbox: true,
    showDateSelector: true,
    showSearch: true,
    showFilter: true,
    itemsPerPageOptions: [10, 25, 50, 100],
    defaultItemsPerPage: 10,
    columns: [
      { key: 'certificateNumber', label: 'Certificate Number', sortable: true },
      { key: 'recipientName', label: 'Recipient Name', sortable: true },
      { key: 'status', label: 'Status', sortable: true },
      { key: 'hash', label: 'Hash', sortable: false },
      { key: 'issuedAt', label: 'Verified', sortable: true }
    ]
  };

  constructor(
    private certificateService: CertificateService,
    private router: Router
  ) {
    effect(() => {
      this.filteredVerifications.set(this.verifications());
    });
  }

  ngOnInit(): void {
    this.loadVerifications();
  }

  loadVerifications(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    // For verification, we might want to show all certificates or only verified ones
    this.certificateService.getAllCertificates().subscribe({
      next: (certificates) => {
        // Filter to show only issued certificates for verification
        const verified = certificates.filter(cert => cert.status === 'ISSUED');
        this.verifications.set(verified);
        this.filteredVerifications.set(verified);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading verifications:', error);
        this.errorMessage.set(error?.message || 'Failed to load verifications. Please try again.');
        this.isLoading.set(false);
        // Set empty array on error to show empty state
        this.verifications.set([]);
        this.filteredVerifications.set([]);
      }
    });
  }

  onSearch(query: string): void {
    if (!query.trim()) {
      this.filteredVerifications.set(this.verifications());
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = this.verifications().filter(verification =>
      verification.certificateNumber.toLowerCase().includes(lowerQuery) ||
      verification.recipientName.toLowerCase().includes(lowerQuery) ||
      (verification.hash && verification.hash.toLowerCase().includes(lowerQuery))
    );
    this.filteredVerifications.set(filtered);
  }

  onFilter(): void {
    console.log('Filter clicked');
  }

  onAdd(): void {
    // Open verification dialog/modal
    console.log('Verify certificate clicked');
  }

  onPageChange(page: number): void {
    // Handled by DataGridComponent
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    // Handled by DataGridComponent
  }

  onRowClick(verification: CertificateResponse): void {
    console.log('Row clicked:', verification);
  }

  onActionClick(event: { action: string; item: CertificateResponse }): void {
    console.log('Action clicked:', event);
  }

  formatVerificationData(verifications: CertificateResponse[]): any[] {
    return verifications.map(verification => ({
      id: verification.id,
      certificateNumber: verification.certificateNumber,
      recipientName: verification.recipientName,
      status: verification.status,
      hash: verification.hash ? `${verification.hash.substring(0, 8)}...` : '-',
      issuedAt: verification.issuedAt || '-',
      // Keep original for actions
      _original: verification
    }));
  }
}

