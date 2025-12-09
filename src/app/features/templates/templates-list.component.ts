import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TemplateService } from '../../core/services/template.service';
import { TemplateResponse } from '../../core/models/template.model';
import { DataGridComponent, DataGridConfig, DataGridColumn } from '../../shared/components/data-grid/data-grid.component';

@Component({
  selector: 'app-templates-list',
  standalone: true,
  imports: [CommonModule, RouterModule, DataGridComponent],
  templateUrl: './templates-list.component.html',
  styleUrl: './templates-list.component.css'
})
export class TemplatesListComponent implements OnInit {
  templates = signal<TemplateResponse[]>([]);
  isLoading = signal<boolean>(false);
  filteredTemplates = signal<TemplateResponse[]>([]);
  errorMessage = signal<string | null>(null);

  gridConfig: DataGridConfig = {
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
      { key: 'versionStatus', label: 'Status', sortable: true },
      { key: 'createdAt', label: 'Created', sortable: true }
    ]
  };

  constructor(
    private templateService: TemplateService,
    private router: Router
  ) {
    // Update filtered templates when templates change
    effect(() => {
      this.filteredTemplates.set(this.templates());
    });
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.templateService.getAllTemplates().subscribe({
      next: (templates) => {
        // Load version status for each template
        if (templates.length === 0) {
          this.templates.set(templates);
          this.filteredTemplates.set(templates);
          this.isLoading.set(false);
          return;
        }

        const templatesWithStatus: any[] = [];
        let loadedCount = 0;

        templates.forEach(template => {
          this.templateService.getLatestTemplateVersion(template.id).subscribe({
            next: (version) => {
              templatesWithStatus.push({
                ...template,
                versionStatus: version?.status || '-'
              });
              loadedCount++;
              if (loadedCount === templates.length) {
                this.templates.set(templatesWithStatus);
                this.filteredTemplates.set(templatesWithStatus);
                this.isLoading.set(false);
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
                this.templates.set(templatesWithStatus);
                this.filteredTemplates.set(templatesWithStatus);
                this.isLoading.set(false);
              }
            }
          });
        });
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.errorMessage.set(error?.message || 'Failed to load templates. Please try again.');
        this.isLoading.set(false);
        // Set empty array on error to show empty state
        this.templates.set([]);
        this.filteredTemplates.set([]);
      }
    });
  }

  onSearch(query: string): void {
    if (!query.trim()) {
      this.filteredTemplates.set(this.templates());
      return;
    }

    const lowerQuery = query.toLowerCase();
    const filtered = this.templates().filter(template =>
      template.name.toLowerCase().includes(lowerQuery) ||
      (template.code && template.code.toLowerCase().includes(lowerQuery)) ||
      (template.description && template.description.toLowerCase().includes(lowerQuery))
    );
    this.filteredTemplates.set(filtered);
  }

  onFilter(): void {
    // TODO: Implement filter dialog/modal
    console.log('Filter clicked');
  }

  onAdd(): void {
    // TODO: Navigate to create template page
    console.log('Add template clicked');
  }

  onPageChange(page: number): void {
    // Handled by DataGridComponent
  }

  onItemsPerPageChange(itemsPerPage: number): void {
    // Handled by DataGridComponent
  }

  onRowClick(template: TemplateResponse): void {
    // TODO: Navigate to template detail/edit page
    console.log('Row clicked:', template);
  }

  onActionClick(event: { action: string; item: TemplateResponse }): void {
    // TODO: Show action menu (edit, delete, etc.)
    console.log('Action clicked:', event);
  }

  // Format data for display
  formatTemplateData(templates: any[]): any[] {
    return templates.map(template => ({
      id: template.id,
      name: template.name,
      code: template.code || '-',
      description: template.description || '-',
      currentVersion: template.currentVersion ? `v${template.currentVersion}` : 'v1',
      versionStatus: template.versionStatus || '-',
      createdAt: template.createdAt || '-',
      // Keep original for actions
      _original: template
    }));
  }
}

