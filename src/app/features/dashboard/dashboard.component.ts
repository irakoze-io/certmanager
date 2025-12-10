import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CustomerService } from '../../core/services/customer.service';
import { TemplateService } from '../../core/services/template.service';
import { CertificateService } from '../../core/services/certificate.service';
import { ToastService } from '../../core/services/toast.service';
import { User } from '../../core/models/auth.model';
import { CustomerResponse } from '../../core/models/customer.model';
import { TemplateResponse, TemplateVersionResponse, TemplateVersionStatus } from '../../core/models/template.model';
import { CertificateResponse } from '../../core/models/certificate.model';
import { DashboardCardComponent, DashboardCardConfig, EntityType } from '../../shared/components/dashboard-card/dashboard-card.component';
import { DataGridComponent, DataGridConfig } from '../../shared/components/data-grid/data-grid.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { TemplateCreateFormComponent } from '../templates/components/template-create-form/template-create-form.component';
import { TemplateEnrichFormComponent } from '../templates/components/template-enrich-form/template-enrich-form.component';
import { TemplateDetailsModalComponent } from '../templates/components/template-details-modal/template-details-modal.component';
import { CertificateCreateFormComponent } from '../certificates/components/certificate-create-form/certificate-create-form.component';
import { CertificateViewComponent } from '../certificates/components/certificate-view/certificate-view.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    DashboardCardComponent,
    DataGridComponent,
    ModalComponent,
    TemplateCreateFormComponent,
    TemplateEnrichFormComponent,
    CertificateCreateFormComponent,
    CertificateViewComponent,
    TemplateDetailsModalComponent
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
  showTemplateDetailsModal = signal<boolean>(false);
  showEnrichModal = signal<boolean>(false);
  showCertificateModal = signal<boolean>(false);
  showCertificateViewModal = signal<boolean>(false);
  modalTitle = signal<string>('');
  selectedTemplate = signal<TemplateResponse | null>(null);
  selectedVersionId = signal<string | undefined>(undefined);
  selectedCertificateId = signal<string | undefined>(undefined);
  isEditingTemplate = signal<boolean>(false);
  showDeleteConfirmation = signal<boolean>(false);
  templateToDelete = signal<TemplateResponse | null>(null);

  // Template dropdown for version creation
  showTemplateDropdown = signal<boolean>(false);
  availableTemplates = signal<TemplateResponse[]>([]);

  // Expanded templates state for drawer functionality (for versions grid only)
  expandedTemplateId = signal<number | null>(null);

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
    private toastService: ToastService,
    private router: Router
  ) {
    // Update filtered data when grid data or expansion state changes
    effect(() => {
      const currentData = this.gridData();
      const expandedId = this.expandedTemplateId();
      const gridType = this.activeGridType();

      // Transform data for versions grid (always add _isExpanded property)
      const transformedData: any[] = [];
      
      currentData.forEach(item => {
        const itemData = item._original || item;
        const isExpanded = gridType === 'versions' && expandedId && itemData._isTemplateRow && itemData.templateId === expandedId;
        
        // Add the parent row with expanded state
        transformedData.push({
          ...item,
          _isExpanded: isExpanded
        });
        
        // If this is a template row with multiple versions and it's expanded, add version rows
        if (isExpanded && itemData.versions && itemData.versions.length > 1) {
          // Add each version as a row
          itemData.versions.forEach((version: any) => {
            const versionNum = typeof version.version === 'number' 
              ? version.version 
              : parseInt(version.version.toString(), 10);
            
            transformedData.push({
              id: version.id,
              templateName: item.templateName || '-',
              description: item.description || '-',
              templateId: version.templateId,
              version: typeof version.version === 'string' && version.version.startsWith('v')
                ? version.version
                : `v${versionNum}`,
              status: version.status,
              createdBy: version.createdBy || '-',
              createdByName: version.createdByName || '-',
              createdAt: version.createdAt || '-',
              _original: version,
              _isVersionRow: true
            });
          });
        }
      });

      this.filteredGridData.set(transformedData);
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
        { key: 'description', label: 'Description', sortable: false },
        { key: 'version', label: 'Version', sortable: true },
        { key: 'versionStatus', label: 'Status', sortable: true },
        { key: 'createdAt', label: 'Created', sortable: true }
      ],
      actions: [
        {
          label: 'Edit',
          action: 'edit',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>'
        },
        {
          label: 'Enrich',
          action: 'enrich',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>'
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
        // Load only latest version status for each template (no drawer on templates grid)
        if (templates.length === 0) {
          this.gridData.set(this.formatTemplateData(templates));
          this.isLoadingGrid.set(false);
          return;
        }

        const templatesWithStatus: any[] = [];
        let loadedCount = 0;

        templates.forEach(template => {
          // Fetch only latest version for status display
          this.templateService.getLatestTemplateVersion(template.id).subscribe({
            next: (version) => {
              templatesWithStatus.push({
                ...template,
                versionStatus: version?.status || '-'
              });
              loadedCount++;
              if (loadedCount === templates.length) {
                this.gridData.set(this.formatTemplateData(templatesWithStatus));
                this.isLoadingGrid.set(false);
              }
            },
            error: (error) => {
              console.error(`Error loading version for template ${template.id}:`, error);
              templatesWithStatus.push({
                ...template,
                versionStatus: '-'
              });
              loadedCount++;
              if (loadedCount === templates.length) {
                this.gridData.set(this.formatTemplateData(templatesWithStatus));
                this.isLoadingGrid.set(false);
              }
            }
          });
        });
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
        { key: 'description', label: 'Description', sortable: false },
        { key: 'version', label: 'Version', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'createdAt', label: 'Created', sortable: true }
      ],
      actions: [
        {
          label: 'Publish',
          action: 'publishVersion',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>'
        },
        {
          label: 'Edit',
          action: 'editVersion',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>'
        }
      ]
    });

    this.isLoadingGrid.set(true);
    this.errorMessage.set(null);

    const customerId = this.currentUser()?.customerId;
    if (!customerId) {
      console.error('[Versions] No customerId available for current user');
      this.errorMessage.set('Unable to load template versions: Customer ID not found.');
      this.isLoadingGrid.set(false);
      this.gridData.set([]);
      return;
    }

    // Load all template versions for the customer using the new endpoint
    this.templateService.getAllTemplateVersionsByCustomer(customerId).subscribe({
      next: (versions) => {
        // We need to get template names, so load templates to create a map
        this.templateService.getAllTemplates().subscribe({
          next: (templates) => {
            // Create a map of templateId -> template info
            const templateMap = new Map<number, { name: string; description: string }>();
            templates.forEach(template => {
              templateMap.set(template.id, {
                name: template.name,
                description: template.description || '-'
              });
            });

            // Group versions by templateId
            const versionsByTemplate = new Map<number, any[]>();
            versions.forEach(version => {
              if (!versionsByTemplate.has(version.templateId)) {
                versionsByTemplate.set(version.templateId, []);
              }
              versionsByTemplate.get(version.templateId)!.push(version);
            });

            // Format grouped versions - create parent rows for templates with multiple versions
            const formattedVersions: any[] = [];
            versionsByTemplate.forEach((templateVersions, templateId) => {
              const templateInfo = templateMap.get(templateId);
              const versionCount = templateVersions.length;
              
              // Sort versions by version number (descending)
              const sortedVersions = [...templateVersions].sort((a, b) => {
                const versionA = typeof a.version === 'number' ? a.version : parseInt(a.version.toString(), 10);
                const versionB = typeof b.version === 'number' ? b.version : parseInt(b.version.toString(), 10);
                return versionB - versionA;
              });

              if (versionCount > 1) {
                // Create parent row showing version count
                formattedVersions.push({
                  id: `template-${templateId}`,
                  templateName: templateInfo?.name || '-',
                  description: templateInfo?.description || '-',
                  templateId: templateId,
                  version: `${versionCount} versions`,
                  status: sortedVersions[0].status, // Show latest version status
                  createdBy: sortedVersions[0].createdBy || '-',
                  createdByName: sortedVersions[0].createdByName || '-',
                  createdAt: sortedVersions[0].createdAt || '-',
                  _original: {
                    templateId: templateId,
                    versions: sortedVersions,
                    versionCount: versionCount,
                    _isTemplateRow: true
                  }
                });
              } else {
                // Single version - show as regular row
                const version = sortedVersions[0];
                formattedVersions.push({
                  id: version.id,
                  templateName: templateInfo?.name || '-',
                  description: templateInfo?.description || '-',
                  templateId: version.templateId,
                  version: typeof version.version === 'string' && version.version.startsWith('v')
                    ? version.version
                    : `v${version.version}`,
                  status: version.status,
                  createdBy: version.createdBy || '-',
                  createdByName: version.createdByName || '-',
                  createdAt: version.createdAt || '-',
                  _original: version
                });
              }
            });

            this.gridData.set(formattedVersions);
            this.isLoadingGrid.set(false);
          },
          error: (error) => {
            console.error('[Versions] Error loading templates:', error);
            // Still show versions even if template names fail to load
            const formattedVersions = versions.map(version => ({
              id: version.id,
              templateName: '-',
              description: '-',
              templateId: version.templateId,
              version: typeof version.version === 'string' && version.version.startsWith('v')
                ? version.version
                : `v${version.version}`,
              status: version.status,
              createdBy: version.createdBy || '-',
              createdByName: version.createdByName || '-',
              createdAt: version.createdAt || '-',
              _original: version
            }));
            this.gridData.set(formattedVersions);
            this.isLoadingGrid.set(false);
          }
        });
      },
      error: (error) => {
        console.error('[Versions] Error loading template versions:', error);
        this.errorMessage.set(error?.message || 'Failed to load template versions. Please try again.');
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
        { key: 'recipientName', label: 'Recipient', sortable: true },
        { key: 'templateName', label: 'Template', sortable: true },
        { key: 'issuerUserId', label: 'Issuer', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'issuedAt', label: 'Issued', sortable: true }
      ],
      actions: [
        {
          label: 'Download',
          action: 'downloadCertificate',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>'
        },
        {
          label: 'View',
          action: 'viewCertificate',
          icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>'
        }
      ]
    });

    this.isLoadingGrid.set(true);
    this.errorMessage.set(null);

    const customerId = this.currentUser()?.customerId;
    if (!customerId) {
      console.error('[Certificates] No customerId available for current user');
      this.errorMessage.set('Unable to load certificates: Customer ID not found.');
      this.isLoadingGrid.set(false);
      this.gridData.set([]);
      return;
    }

    this.certificateService.getAllCertificates({ customerId }).subscribe({
      next: (certificates) => {
        console.log('[Certificates] Raw response:', certificates);
        console.log('[Certificates] Count:', certificates?.length || 0);
        if (certificates && certificates.length > 0) {
          console.log('[Certificates] First certificate structure:', certificates[0]);
          console.log('[Certificates] First certificate keys:', Object.keys(certificates[0]));
        }

        if (!certificates || certificates.length === 0) {
          console.warn('[Certificates] No certificates returned from API');
          this.gridData.set([]);
          this.isLoadingGrid.set(false);
          return;
        }

        // Load templates and their versions to get template names
        this.templateService.getAllTemplates().subscribe({
          next: (templates) => {
            // Load all versions for all templates
            const templateVersionMap = new Map<string, { name: string; templateId: number }>();
            let loadedCount = 0;

            if (templates.length === 0) {
              // No templates, format certificates without template names
              const formatted = this.formatCertificateData(certificates, templateVersionMap);
              this.gridData.set(formatted);
              this.isLoadingGrid.set(false);
              return;
            }

            templates.forEach(template => {
              this.templateService.getTemplateVersions(template.id).subscribe({
                next: (versions) => {
                  versions.forEach(version => {
                    if (version.id) {
                      templateVersionMap.set(version.id, { name: template.name, templateId: template.id });
                    }
                  });
                  loadedCount++;
                  if (loadedCount === templates.length) {
                    // All versions loaded, now format certificates
                    const formatted = this.formatCertificateData(certificates, templateVersionMap);
                    console.log('[Certificates] Formatted:', formatted);
                    this.gridData.set(formatted);
                    this.isLoadingGrid.set(false);
                  }
                },
                error: (error) => {
                  console.error(`[Certificates] Error loading versions for template ${template.id}:`, error);
                  loadedCount++;
                  if (loadedCount === templates.length) {
                    // Format even if some versions failed to load
                    const formatted = this.formatCertificateData(certificates, templateVersionMap);
                    this.gridData.set(formatted);
                    this.isLoadingGrid.set(false);
                  }
                }
              });
            });
          },
          error: (error) => {
            console.error('[Certificates] Error loading templates:', error);
            // Format without template names if template loading fails
            const formatted = this.formatCertificateData(certificates, new Map());
            this.gridData.set(formatted);
            this.isLoadingGrid.set(false);
          }
        });
      },
      error: (error) => {
        console.error('[Certificates] Error loading:', error);
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
        filtered = this.gridData().filter(item => {
          const recipientName = item.recipientName || '';
          const recipientEmail = item.recipientEmail || '';
          return item.certificateNumber?.toLowerCase().includes(lowerQuery) ||
            recipientName.toLowerCase().includes(lowerQuery) ||
            recipientEmail.toLowerCase().includes(lowerQuery);
        });
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
        this.selectedTemplate.set(null);
        this.isEditingTemplate.set(false);
        this.modalTitle.set('Create New Template');
        this.showCreateModal.set(true);
        break;
      case 'versions':
        // Load templates and show dropdown
        this.templateService.getAllTemplates().subscribe({
          next: (templates) => {
            this.availableTemplates.set(templates);
            this.showTemplateDropdown.set(true);
          },
          error: (error) => {
            console.error('Error loading templates:', error);
            this.errorMessage.set('Failed to load templates. Please try again.');
          }
        });
        break;
      case 'certificates':
        this.modalTitle.set('Create New Certificate');
        this.showCertificateModal.set(true);
        break;
    }
  }

  onTemplateSelectedForVersion(template: TemplateResponse): void {
    this.selectedTemplate.set(template);
    this.selectedVersionId.set(undefined);
    this.modalTitle.set('Create template version');
    this.showTemplateDropdown.set(false);
    this.showEnrichModal.set(true);
  }

  closeTemplateDropdown(): void {
    this.showTemplateDropdown.set(false);
  }

  onTemplateCreated(): void {
    this.showCreateModal.set(false);
    this.selectedTemplate.set(null);
    this.isEditingTemplate.set(false);
    // Reload templates to show the new one or updated one
    if (this.activeGridType() === 'templates') {
      this.loadTemplates();
    }
  }

  onModalClose(): void {
    this.showCreateModal.set(false);
    this.showTemplateDetailsModal.set(false);
    this.showEnrichModal.set(false);
    this.showCertificateModal.set(false);
    this.showCertificateViewModal.set(false);
    this.selectedTemplate.set(null);
    this.selectedVersionId.set(undefined);
    this.selectedCertificateId.set(undefined);
    this.isEditingTemplate.set(false);
    this.showDeleteConfirmation.set(false);
    this.templateToDelete.set(null);
    this.expandedTemplateId.set(null); // Collapse any expanded templates
  }

  onTemplateDetailsEnrich(template: TemplateResponse): void {
    // Set template first to ensure it's available
    this.selectedTemplate.set(template);
    this.selectedVersionId.set(undefined);
    this.modalTitle.set('Enrich Template');
    
    // Close template details modal
    this.showTemplateDetailsModal.set(false);
    
    // Open enrich modal - use setTimeout to ensure details modal closes first
    setTimeout(() => {
      this.showEnrichModal.set(true);
    }, 10);
  }

  onTemplateDetailsDeleted(): void {
    // Reload templates to reflect the change
    if (this.activeGridType() === 'templates') {
      this.loadTemplates();
    }
  }

  onTemplateDetailsPublished(): void {
    // Reload templates to reflect the change
    if (this.activeGridType() === 'templates') {
      this.loadTemplates();
    }
  }

  onCertificateCreated(): void {
    this.showCertificateModal.set(false);
    // Reload certificates to show the new one
    if (this.activeGridType() === 'certificates') {
      this.loadCertificates();
    }
  }

  onCertificateGenerated(): void {
    // Reload certificates list without closing the modal
    if (this.activeGridType() === 'certificates') {
      this.loadCertificates();
    }
  }

  onCertificateUpdated(): void {
    // Reload certificates to reflect updates
    if (this.activeGridType() === 'certificates') {
      this.loadCertificates();
    }
  }

  onTemplateEdit(): void {
    // Edit action is already handled by the edit button in the modal
    // This can be used for future enhancements if needed
  }

  onTemplateDelete(): void {
    const template = this.selectedTemplate();
    if (template) {
      this.templateToDelete.set(template);
      this.showDeleteConfirmation.set(true);
    }
  }

  confirmDeleteTemplate(): void {
    const template = this.templateToDelete();
    if (!template || !template.id) {
      this.toastService.error('Invalid template data.');
      this.showDeleteConfirmation.set(false);
      this.templateToDelete.set(null);
      return;
    }

    this.templateService.deleteTemplate(template.id).subscribe({
      next: () => {
        this.toastService.success('Template deleted successfully.');
        this.showDeleteConfirmation.set(false);
        this.templateToDelete.set(null);
        this.onModalClose();

        // Reload templates to reflect the change
        if (this.activeGridType() === 'templates') {
          this.loadTemplates();
        }
      },
      error: (error) => {
        console.error('Error deleting template:', error);
        let errorMsg = 'Failed to delete template.';

        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        } else if (typeof error?.error === 'string') {
          errorMsg = error.error;
        }

        if (error?.status === 400 || error?.status === 422) {
          this.toastService.warning(errorMsg);
        } else {
          this.toastService.error(errorMsg);
        }

        this.showDeleteConfirmation.set(false);
        this.templateToDelete.set(null);
      }
    });
  }

  cancelDeleteTemplate(): void {
    this.showDeleteConfirmation.set(false);
    this.templateToDelete.set(null);
  }

  onTemplateVersionCreated(): void {
    this.showEnrichModal.set(false);
    this.selectedTemplate.set(null);
    this.selectedVersionId.set(undefined);
    // Reload data based on active grid type
    if (this.activeGridType() === 'templates') {
      this.loadTemplates();
    } else if (this.activeGridType() === 'versions') {
      this.loadVersions();
    }
  }

  onPageChange(page: number): void {
    // Handled by DataGridComponent
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    // Handled by DataGridComponent
  }

  onRowClick(item: any): void {
    const gridType = this.activeGridType();
    
    // If clicking on a template row
    if (gridType === 'templates') {
      const templateData = item._original || item;
      
      if (!templateData || !templateData.id) {
        console.error('Invalid template data:', item);
        this.toastService.error('Invalid template data. Please try again.');
        return;
      }

      // Templates grid: always show template details modal (no drawer)
      this.showTemplateDetails(templateData);
    } else if (gridType === 'versions') {
      // Versions grid: handle drawer expansion and version clicks
      const itemData = item._original || item;
      
      if (!itemData) {
        console.error('Invalid version data:', item);
        this.toastService.error('Invalid version data. Please try again.');
        return;
      }

      // Check if this is a version row (from expanded drawer)
      if (item._isVersionRow) {
        // Clicked on a version in the drawer - show version details
        const version = itemData;
        const templateId = version.templateId;
        this.showVersionDetails(version, { id: templateId });
        return;
      }

      // Check if this is a template row with multiple versions
      if (itemData._isTemplateRow && itemData.versionCount > 1) {
        // Toggle expansion for templates with multiple versions
        const currentExpanded = this.expandedTemplateId();
        if (currentExpanded === itemData.templateId) {
          // Collapse
          this.expandedTemplateId.set(null);
        } else {
          // Expand
          this.expandedTemplateId.set(itemData.templateId);
        }
        // The effect will automatically update filteredGridData when expandedTemplateId changes
      } else {
        // Single version row - show version details directly
        const version = itemData;
        const templateId = version.templateId;
        this.showVersionDetails(version, { id: templateId });
      }
    } else {
      // TODO: Handle other entity types (certificates, etc.)
      console.log('Row clicked:', item);
    }
  }

  private showTemplateDetails(templateData: any): void {
    this.errorMessage.set(null);
    this.templateService.getTemplateById(templateData.id).subscribe({
      next: (template) => {
        if (!template) {
          this.toastService.error('Template not found. Please try again.');
          return;
        }
        this.selectedTemplate.set(template);
        this.showTemplateDetailsModal.set(true);
      },
      error: (error) => {
        console.error('Error fetching template:', error);
        let errorMsg = 'Failed to load template details.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.toastService.error(errorMsg);
      }
    });
  }

  private showVersionDetails(version: any, templateData: any): void {
    // Fetch template to show version details modal
    this.errorMessage.set(null);
    this.templateService.getTemplateById(templateData.id).subscribe({
      next: (template) => {
        if (!template) {
          this.toastService.error('Template not found. Please try again.');
          return;
        }
        // Set the selected version ID and open template details modal
        // The template details modal should show version-specific info
        this.selectedTemplate.set(template);
        this.selectedVersionId.set(version.id);
        this.showTemplateDetailsModal.set(true);
      },
      error: (error) => {
        console.error('Error fetching template:', error);
        let errorMsg = 'Failed to load template details.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.toastService.error(errorMsg);
      }
    });
  }


  onActionClick(event: { action: string; item: any }): void {
    const { action, item } = event;

    switch (action) {
      case 'enrich':
        // Ensure we have the original template data
        const templateData = item._original || item;

        if (!templateData || !templateData.id) {
          console.error('Invalid template data:', item);
          this.toastService.error('Invalid template data. Please try again.');
          return;
        }

        // Clear any previous error
        this.errorMessage.set(null);

        // Fetch full template details to ensure we have latest data
        this.templateService.getTemplateById(templateData.id).subscribe({
          next: (template) => {
            if (!template) {
              this.toastService.error('Template not found. Please try again.');
              return;
            }

            this.selectedTemplate.set(template);
            this.selectedVersionId.set(undefined);
            this.modalTitle.set('Enrich Template');
            this.showEnrichModal.set(true);
          },
          error: (error) => {
            console.error('Error fetching template:', error);
            let errorMsg = 'Failed to load template details.';
            if (error?.error?.message) {
              errorMsg = error.error.message;
            } else if (error?.message) {
              errorMsg = error.message;
            }
            this.toastService.error(errorMsg);
          }
        });
        break;
      case 'edit':
        // Get template data
        const editTemplateData = item._original || item;

        if (!editTemplateData || !editTemplateData.id) {
          console.error('Invalid template data:', item);
          this.toastService.error('Invalid template data. Please try again.');
          return;
        }

        // Check if template has a published version
        this.templateService.getLatestTemplateVersion(editTemplateData.id).subscribe({
          next: (version) => {
            if (version && version.status === TemplateVersionStatus.PUBLISHED) {
              this.toastService.error('This template cannot be edited because it has a published version.');
              return;
            }

            // Clear any previous error
            this.errorMessage.set(null);

            // Fetch full template details to ensure we have latest data
            this.templateService.getTemplateById(editTemplateData.id).subscribe({
              next: (template) => {
                if (!template) {
                  this.toastService.error('Template not found. Please try again.');
                  return;
                }

                this.selectedTemplate.set(template);
                this.isEditingTemplate.set(true);
                this.modalTitle.set('Edit Template');
                this.showCreateModal.set(true);
              },
              error: (error) => {
                console.error('Error fetching template:', error);
                let errorMsg = 'Failed to load template details.';
                if (error?.error?.message) {
                  errorMsg = error.error.message;
                } else if (error?.message) {
                  errorMsg = error.message;
                }
                this.toastService.error(errorMsg);
              }
            });
          },
          error: (error) => {
            // If version fetch fails, still allow editing (might be a new template)
            console.error('Error fetching version:', error);
            // Continue with edit flow
            this.templateService.getTemplateById(editTemplateData.id).subscribe({
              next: (template) => {
                if (!template) {
                  this.toastService.error('Template not found. Please try again.');
                  return;
                }

                this.selectedTemplate.set(template);
                this.isEditingTemplate.set(true);
                this.modalTitle.set('Edit Template');
                this.showCreateModal.set(true);
              },
              error: (error) => {
                console.error('Error fetching template:', error);
                let errorMsg = 'Failed to load template details.';
                if (error?.error?.message) {
                  errorMsg = error.error.message;
                } else if (error?.message) {
                  errorMsg = error.message;
                }
                this.toastService.error(errorMsg);
              }
            });
          }
        });
        break;
      case 'publish':
        // Get template data
        const publishTemplateData = item._original || item;

        if (!publishTemplateData || !publishTemplateData.id) {
          console.error('Invalid template data:', item);
          this.toastService.error('Invalid template data. Please try again.');
          return;
        }

        // Clear any previous error
        this.errorMessage.set(null);

        // Get the latest version of the template and publish it
        this.templateService.getLatestTemplateVersion(publishTemplateData.id).subscribe({
          next: (version) => {
            if (!version || !version.id) {
              this.toastService.warning('No version found for this template. Please create a version first.');
              return;
            }

            // Check if already published
            if (version.status === TemplateVersionStatus.PUBLISHED) {
              this.toastService.info('This template version has already been published.');
              return;
            }

            // Publish the latest version
            this.templateService.publishTemplateVersion(publishTemplateData.id, version.id).subscribe({
              next: (response) => {
                // Determine toast type and message from response
                let toastType: 'success' | 'error' | 'warning' | 'info' = 'success';
                let message = 'Template version published successfully.';

                // Check if response has a message or status
                if (response && typeof response === 'object') {
                  if (response.message) {
                    message = response.message;
                  }
                  if (response.status) {
                    const status = response.status.toLowerCase();
                    if (status.includes('error') || status.includes('fail')) {
                      toastType = 'error';
                    } else if (status.includes('warning')) {
                      toastType = 'warning';
                    } else if (status.includes('info')) {
                      toastType = 'info';
                    }
                  }
                } else if (typeof response === 'string') {
                  message = response;
                }

                // Show appropriate toast
                if (toastType === 'success') {
                  this.toastService.success(message);
                } else if (toastType === 'error') {
                  this.toastService.error(message);
                } else if (toastType === 'warning') {
                  this.toastService.warning(message);
                } else {
                  this.toastService.info(message);
                }

                // Reload templates to reflect the change
                if (this.activeGridType() === 'templates') {
                  this.loadTemplates();
                } else if (this.activeGridType() === 'versions') {
                  this.loadVersions();
                }
              },
              error: (error) => {
                console.error('Error publishing template version:', error);
                let errorMsg = 'Failed to publish template version.';

                // Extract error message from response
                if (error?.error?.message) {
                  errorMsg = error.error.message;
                } else if (error?.message) {
                  errorMsg = error.message;
                } else if (typeof error?.error === 'string') {
                  errorMsg = error.error;
                }

                // Determine if it's a warning or error based on status code
                if (error?.status === 400 || error?.status === 422) {
                  this.toastService.warning(errorMsg);
                } else {
                  this.toastService.error(errorMsg);
                }
              }
            });
          },
          error: (error) => {
            console.error('Error fetching latest version:', error);
            let errorMsg = 'Failed to load template version.';

            if (error?.error?.message) {
              errorMsg = error.error.message;
            } else if (error?.message) {
              errorMsg = error.message;
            }

            this.toastService.error(errorMsg);
          }
        });
        break;
      case 'publishVersion':
        // Get version data
        const publishVersionData = item._original || item;

        if (!publishVersionData || !publishVersionData.templateId || !publishVersionData.id) {
          console.error('Invalid version data:', item);
          this.toastService.error('Invalid version data. Please try again.');
          return;
        }

        // Check if already published
        if (publishVersionData.status === TemplateVersionStatus.PUBLISHED) {
          this.toastService.info('This template version has already been published.');
          return;
        }

        // Clear any previous error
        this.errorMessage.set(null);

        // Publish the version
        this.templateService.publishTemplateVersion(publishVersionData.templateId, publishVersionData.id).subscribe({
          next: (response) => {
            // Determine toast type and message from response
            let toastType: 'success' | 'error' | 'warning' | 'info' = 'success';
            let message = 'Template version published successfully.';

            // Check if response has a message or status
            if (response && typeof response === 'object') {
              if (response.message) {
                message = response.message;
              }
              if (response.status) {
                const status = response.status.toLowerCase();
                if (status.includes('error') || status.includes('fail')) {
                  toastType = 'error';
                } else if (status.includes('warning')) {
                  toastType = 'warning';
                } else if (status.includes('info')) {
                  toastType = 'info';
                }
              }
            } else if (typeof response === 'string') {
              message = response;
            }

            // Show appropriate toast
            if (toastType === 'success') {
              this.toastService.success(message);
            } else if (toastType === 'error') {
              this.toastService.error(message);
            } else if (toastType === 'warning') {
              this.toastService.warning(message);
            } else {
              this.toastService.info(message);
            }

            // Reload versions to reflect the change
            if (this.activeGridType() === 'versions') {
              this.loadVersions();
            } else if (this.activeGridType() === 'templates') {
              this.loadTemplates();
            }
          },
          error: (error) => {
            console.error('Error publishing version:', error);
            let errorMsg = 'Failed to publish template version.';

            // Extract error message from response
            if (error?.error?.message) {
              errorMsg = error.error.message;
            } else if (error?.message) {
              errorMsg = error.message;
            } else if (typeof error?.error === 'string') {
              errorMsg = error.error;
            }

            // Determine if it's a warning or error based on status code
            if (error?.status === 400 || error?.status === 422) {
              this.toastService.warning(errorMsg);
            } else {
              this.toastService.error(errorMsg);
            }
          }
        });
        break;
      case 'editVersion':
        // Get version data
        const versionData = item._original || item;

        if (!versionData || !versionData.templateId || !versionData.id) {
          console.error('Invalid version data:', item);
          this.toastService.error('Invalid version data. Please try again.');
          return;
        }

        // Check if version is published
        if (versionData.status === TemplateVersionStatus.PUBLISHED) {
          this.toastService.error('This template version cannot be edited because it is published.');
          return;
        }

        // Clear any previous error
        this.errorMessage.set(null);

        // Fetch template details
        this.templateService.getTemplateById(versionData.templateId).subscribe({
          next: (template) => {
            if (!template) {
              this.toastService.error('Template not found. Please try again.');
              return;
            }

            this.selectedTemplate.set(template);
            this.selectedVersionId.set(versionData.id);
            this.modalTitle.set('Edit Template Version');
            this.showEnrichModal.set(true);
          },
          error: (error) => {
            console.error('Error fetching template:', error);
            let errorMsg = 'Failed to load template details.';
            if (error?.error?.message) {
              errorMsg = error.error.message;
            } else if (error?.message) {
              errorMsg = error.message;
            }
            this.toastService.error(errorMsg);
          }
        });
        break;
      case 'downloadCertificate':
        const downloadCertData = item._original || item;

        if (!downloadCertData || !downloadCertData.id) {
          this.toastService.error('Invalid certificate data.');
          return;
        }

        if (downloadCertData.status !== 'ISSUED') {
          this.toastService.warning('Certificate is not ready for download. Status: ' + downloadCertData.status);
          return;
        }

        this.certificateService.getDownloadUrl(downloadCertData.id, 60).subscribe({
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
        break;
      case 'viewCertificate':
        const viewCertData = item._original || item;

        if (!viewCertData || !viewCertData.id) {
          this.toastService.error('Invalid certificate data.');
          return;
        }

        this.selectedCertificateId.set(viewCertData.id);
        this.modalTitle.set('Certificate Details');
        this.showCertificateViewModal.set(true);
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  formatTemplateData(templates: any[]): any[] {
    return templates.map(template => ({
      id: template.id,
      name: template.name,
      code: template.code || '-',
      description: template.description || '-',
      version: template.currentVersion ? `v${template.currentVersion}` : 'v1',
      versionStatus: template.versionStatus || '-',
      createdAt: template.createdAt || '-',
      _original: template
    }));
  }

  formatCertificateData(
    certificates: CertificateResponse[],
    templateVersionMap: Map<string, { name: string; templateId: number }>
  ): any[] {
    if (!certificates || !Array.isArray(certificates)) {
      console.warn('[formatCertificateData] Invalid input:', certificates);
      return [];
    }

    return certificates.map(cert => {
      if (!cert) {
        console.warn('[formatCertificateData] Null certificate in array');
        return null;
      }

      // Find template name by matching templateVersionId
      const templateInfo = templateVersionMap.get(cert.templateVersionId);
      const templateName = templateInfo?.name || '-';

      // Use issuedBy (UUID) for issuer user ID
      const issuerUserId = cert.issuedBy || '-';

      const formatted = {
        id: cert.id || '-',
        certificateNumber: cert.certificateNumber || '-',
        recipientName: cert.recipientData?.['name'] || '-',
        recipientEmail: cert.recipientData?.['email'] || '-',
        templateName: templateName,
        templateVersionId: cert.templateVersionId,
        issuerUserId: issuerUserId,
        issuerByName: cert.issuedByName || '-',
        status: cert.status || '-',
        issuedAt: cert.issuedAt || '-',
        _original: cert
      };
      return formatted;
    }).filter(item => item !== null);
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
    window.location.href = '/login';
  }
}
