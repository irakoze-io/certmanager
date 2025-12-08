import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CustomerService } from '../../core/services/customer.service';
import { TemplateService } from '../../core/services/template.service';
import { CertificateService } from '../../core/services/certificate.service';
import { User } from '../../core/models/auth.model';
import { CustomerResponse } from '../../core/models/customer.model';
import { TemplateResponse } from '../../core/models/template.model';
import { TemplateVersionResponse } from '../../core/models/template.model';
import { CertificateResponse } from '../../core/models/certificate.model';
import { DashboardCardComponent, DashboardCardConfig, EntityType } from '../../shared/components/dashboard-card/dashboard-card.component';
import { DataGridComponent, DataGridConfig } from '../../shared/components/data-grid/data-grid.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { TemplateCreateFormComponent } from '../templates/components/template-create-form/template-create-form.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardCardComponent,
    DataGridComponent,
    ModalComponent,
    TemplateCreateFormComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);
  tenantId = signal<number | null>(null);
  tenantSchema = signal<string | null>(null);
  customer = signal<CustomerResponse | null>(null);
  
  // Grid state
  activeGridType = signal<EntityType | null>(null);
  gridData = signal<any[]>([]);
  filteredGridData = signal<any[]>([]);
  isLoadingGrid = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  gridConfig = signal<DataGridConfig | null>(null);

  // Modal state
  showCreateModal = signal<boolean>(false);
  modalTitle = signal<string>('');

  // Dashboard card configurations
  templatesConfig: DashboardCardConfig = {
    title: 'Templates',
    description: 'Manage certificate templates and versions',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    color: 'templates',
    entityType: 'templates',
    routerLink: '/templates',
    linkText: 'View templates'
  };

  versionsConfig: DashboardCardConfig = {
    title: 'Versions',
    description: 'Manage template versions and revisions',
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
    color: 'versions',
    entityType: 'versions',
    routerLink: '/templates', // Versions are managed within templates
    linkText: 'View versions'
  };

  certificatesConfig: DashboardCardConfig = {
    title: 'Certificates',
    description: 'Generate and manage certificates',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'certificates',
    entityType: 'certificates',
    routerLink: '/certificates',
    linkText: 'View certificates'
  };

  constructor(
    private authService: AuthService,
    private customerService: CustomerService,
    private templateService: TemplateService,
    private certificateService: CertificateService,
    private router: Router
  ) {
    // Update filtered data when grid data changes
    effect(() => {
      this.filteredGridData.set(this.gridData());
    });
  }

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Get current user info - ensure we're using fresh data
    const user = this.authService.currentUser();
    const tenantId = this.authService.currentTenantId();
    const tenantSchema = this.authService.currentTenantSchema();

    // Validate we have all required data
    if (!user || !tenantId) {
      console.error('Missing auth data:', { user, tenantId, tenantSchema });
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser.set(user);
    this.tenantId.set(tenantId);
    this.tenantSchema.set(tenantSchema);

    // Fetch customer information using the current user's customerId
    // Log for debugging
    console.log('Dashboard: Fetching customer data', {
      userId: user.id,
      customerId: user.customerId,
      tenantId: tenantId,
      tenantSchema: tenantSchema,
      email: user.email
    });

    if (user.customerId) {
      this.customerService.getCustomerById(user.customerId).subscribe({
        next: (customer) => {
          console.log('Dashboard: Customer data loaded', customer);
          this.customer.set(customer);
        },
        error: (error) => {
          console.error('Failed to fetch customer:', error);
          // If customer fetch fails due to tenant mismatch, clear auth and redirect
          if (error.status === 403 && error.error?.errorCode === 'TENANT_MISMATCH') {
            console.error('Tenant mismatch detected - clearing auth state');
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
    } else {
      console.error('User has no customerId:', user);
    }
  }

  onCardLinkClick(entityType: EntityType): void {
    this.activeGridType.set(entityType);
    this.loadGridData(entityType);
  }

  loadGridData(entityType: EntityType): void {
    this.isLoadingGrid.set(true);
    this.errorMessage.set(null);

    switch (entityType) {
      case 'templates':
        this.loadTemplates();
        break;
      case 'versions':
        this.loadVersions();
        break;
      case 'certificates':
        this.loadCertificates();
        break;
    }
  }

  loadTemplates(): void {
    this.gridConfig.set({
      title: 'Templates',
      addButtonLabel: 'Add New Template',
      showCheckbox: true,
      showDateSelector: true,
      showSearch: true,
      showFilter: true,
      itemsPerPageOptions: [10, 25, 50, 100],
      defaultItemsPerPage: 10,
      columns: [
        { key: 'name', label: 'Template name', sortable: true },
        { key: 'code', label: 'Code', sortable: true },
        { key: 'description', label: 'Description', sortable: false },
        { key: 'currentVersion', label: 'Version', sortable: true },
        { key: 'createdAt', label: 'Created', sortable: true }
      ],
      actions: [
        {
          label: 'Edit',
          action: 'edit',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>'
        },
        {
          label: 'Archive',
          action: 'archive',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>'
        },
        {
          label: 'Publish',
          action: 'publish',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>'
        }
      ]
    });

    this.templateService.getAllTemplates().subscribe({
      next: (templates) => {
        this.gridData.set(this.formatTemplateData(templates));
        this.isLoadingGrid.set(false);
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.errorMessage.set(error?.message || 'Failed to load templates. Please try again.');
        this.isLoadingGrid.set(false);
        this.gridData.set([]);
      }
    });
  }

  loadVersions(): void {
    this.gridConfig.set({
      title: 'Versions',
      addButtonLabel: 'Add New Version',
      showCheckbox: true,
      showDateSelector: true,
      showSearch: true,
      showFilter: true,
      itemsPerPageOptions: [10, 25, 50, 100],
      defaultItemsPerPage: 10,
      columns: [
        { key: 'templateName', label: 'Template', sortable: true },
        { key: 'version', label: 'Version', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'createdAt', label: 'Created', sortable: true }
      ]
    });

    // Load all templates first, then get versions for each
    this.templateService.getAllTemplates().subscribe({
      next: (templates) => {
        const allVersions: any[] = [];
        let loadedCount = 0;

        if (templates.length === 0) {
          this.gridData.set([]);
          this.isLoadingGrid.set(false);
          return;
        }

        templates.forEach(template => {
          this.templateService.getTemplateVersions(template.id).subscribe({
            next: (versions) => {
              versions.forEach(version => {
                allVersions.push({
                  id: version.id,
                  templateName: template.name,
                  templateId: template.id,
                  version: version.version.startsWith('v') ? version.version : `v${version.version}`,
                  status: version.status,
                  createdAt: version.createdAt ? new Date(version.createdAt).toLocaleDateString() : '-',
                  _original: version
                });
              });
              loadedCount++;
              if (loadedCount === templates.length) {
                this.gridData.set(allVersions);
                this.isLoadingGrid.set(false);
              }
            },
            error: (error) => {
              console.error(`Error loading versions for template ${template.id}:`, error);
              loadedCount++;
              if (loadedCount === templates.length) {
                this.gridData.set(allVersions);
                this.isLoadingGrid.set(false);
              }
            }
          });
        });
      },
      error: (error) => {
        console.error('Error loading templates for versions:', error);
        this.errorMessage.set(error?.message || 'Failed to load versions. Please try again.');
        this.isLoadingGrid.set(false);
        this.gridData.set([]);
      }
    });
  }

  loadCertificates(): void {
    this.gridConfig.set({
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
    });

    this.certificateService.getAllCertificates().subscribe({
      next: (certificates) => {
        this.gridData.set(this.formatCertificateData(certificates));
        this.isLoadingGrid.set(false);
      },
      error: (error) => {
        console.error('Error loading certificates:', error);
        this.errorMessage.set(error?.message || 'Failed to load certificates. Please try again.');
        this.isLoadingGrid.set(false);
        this.gridData.set([]);
      }
    });
  }

  onSearch(query: string): void {
    if (!query.trim()) {
      this.filteredGridData.set(this.gridData());
      return;
    }

    const lowerQuery = query.toLowerCase();
    const entityType = this.activeGridType();
    let filtered: any[] = [];

    switch (entityType) {
      case 'templates':
        filtered = this.gridData().filter(item =>
          item.name?.toLowerCase().includes(lowerQuery) ||
          item.code?.toLowerCase().includes(lowerQuery) ||
          item.description?.toLowerCase().includes(lowerQuery)
        );
        break;
      case 'versions':
        filtered = this.gridData().filter(item =>
          item.templateName?.toLowerCase().includes(lowerQuery) ||
          item.version?.toLowerCase().includes(lowerQuery) ||
          item.status?.toLowerCase().includes(lowerQuery)
        );
        break;
      case 'certificates':
        filtered = this.gridData().filter(item =>
          item.certificateNumber?.toLowerCase().includes(lowerQuery) ||
          item.recipientName?.toLowerCase().includes(lowerQuery) ||
          item.recipientEmail?.toLowerCase().includes(lowerQuery)
        );
        break;
    }

    this.filteredGridData.set(filtered);
  }

  onFilter(): void {
    // TODO: Implement filter dialog/modal
    console.log('Filter clicked');
  }

  onAdd(): void {
    const entityType = this.activeGridType();
    
    switch (entityType) {
      case 'templates':
        this.modalTitle.set('Create New Template');
        this.showCreateModal.set(true);
        break;
      case 'versions':
        // TODO: Implement version creation modal
        console.log('Add version clicked');
        break;
      case 'certificates':
        // TODO: Implement certificate creation modal
        console.log('Add certificate clicked');
        break;
    }
  }

  onTemplateCreated(): void {
    this.showCreateModal.set(false);
    // Reload templates to show the new one
    if (this.activeGridType() === 'templates') {
      this.loadTemplates();
    }
  }

  onModalClose(): void {
    this.showCreateModal.set(false);
  }

  onPageChange(page: number): void {
    // Handled by DataGridComponent
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    // Handled by DataGridComponent
  }

  onRowClick(item: any): void {
    // TODO: Navigate to detail/edit page based on entity type
    console.log('Row clicked:', item);
  }

  onActionClick(event: { action: string; item: any }): void {
    // TODO: Show action menu (edit, delete, etc.)
    console.log('Action clicked:', event);
  }

  formatTemplateData(templates: TemplateResponse[]): any[] {
    return templates.map(template => ({
      id: template.id,
      name: template.name,
      code: template.code || '-',
      description: template.description || '-',
      currentVersion: template.currentVersion ? `v${template.currentVersion}` : 'v1',
      createdAt: template.createdAt ? new Date(template.createdAt).toLocaleDateString() : '-',
      _original: template
    }));
  }

  formatCertificateData(certificates: CertificateResponse[]): any[] {
    return certificates.map(cert => ({
      id: cert.id,
      certificateNumber: cert.certificateNumber,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      status: cert.status,
      issuedAt: cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString() : '-',
      _original: cert
    }));
  }

  /**
   * Get user's full name
   */
  getUserFullName(): string {
    const user = this.currentUser();
    if (!user) return '';

    const firstName = user.firstName || '';
    const lastName = user.lastName || '';

    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      // Fallback to email if no name is available
      return user.email || '';
    }
  }

  /**
   * Get greeting based on time of day
   */
  getGreeting(): string {
    const user = this.currentUser();
    const lastName = user?.lastName || '';

    const hour = new Date().getHours();
    let greeting = 'Hello';

    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      greeting = 'Good evening';
    } else {
      greeting = 'Good evening';
    }

    return lastName ? `${greeting}, ${lastName}` : greeting;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
