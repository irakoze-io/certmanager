import { Component, OnInit, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TemplateService } from '../../../../core/services/template.service';
import { ToastService } from '../../../../core/services/toast.service';
import { TemplateResponse, TemplateVersionResponse, TemplateVersionStatus, FieldSchemaField, FieldType } from '../../../../core/models/template.model';
import { formatDate, formatTime } from '../../../../core/utils/date.util';

@Component({
  selector: 'app-template-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './template-details-modal.component.html',
  styleUrl: './template-details-modal.component.css'
})
export class TemplateDetailsModalComponent implements OnInit {
  template = input.required<TemplateResponse>();
  isOpen = input<boolean>(false);
  
  onClose = output<void>();
  onEnrich = output<TemplateResponse>();
  onDeleted = output<void>();
  onPublished = output<void>();

  TemplateVersionStatus = TemplateVersionStatus; // Expose to template
  Object = Object; // Expose Object to template
  FieldType = FieldType; // Expose FieldType to template
  formatDate = formatDate; // Expose formatDate to template
  formatTime = formatTime; // Expose formatTime to template

  isLoading = signal<boolean>(false);
  isLoadingVersion = signal<boolean>(false);
  latestVersion = signal<TemplateVersionResponse | null>(null);
  fieldSchema = signal<Record<string, FieldSchemaField>>({});
  category = signal<string>('');

  constructor(
    private templateService: TemplateService,
    private toastService: ToastService
  ) {
    // Update category when template changes
    effect(() => {
      const templateData = this.template();
      if (templateData?.metadata && typeof templateData.metadata === 'object' && 'category' in templateData.metadata) {
        this.category.set(String(templateData.metadata['category'] || 'Uncategorized'));
      } else {
        this.category.set('Uncategorized');
      }
    });
  }

  ngOnInit(): void {
    this.loadLatestVersion();
  }

  loadLatestVersion(): void {
    const templateData = this.template();
    if (!templateData?.id) return;

    this.isLoadingVersion.set(true);
    this.templateService.getLatestTemplateVersion(templateData.id).subscribe({
      next: (version) => {
        this.latestVersion.set(version);
        if (version?.fieldSchema) {
          this.fieldSchema.set(version.fieldSchema);
        } else {
          this.fieldSchema.set({});
        }
        this.isLoadingVersion.set(false);
      },
      error: (error) => {
        console.error('Error loading template version:', error);
        this.isLoadingVersion.set(false);
        this.fieldSchema.set({});
      }
    });
  }

  onEnrichClick(): void {
    const templateData = this.template();
    if (!templateData) return;
    
    // Emit enrich event - parent will handle opening enrich modal and closing this one
    this.onEnrich.emit(templateData);
  }

  onPublishClick(): void {
    const templateData = this.template();
    const version = this.latestVersion();
    
    if (!templateData?.id || !version?.id) {
      this.toastService.error('Invalid template or version data.');
      return;
    }

    if (version.status === TemplateVersionStatus.PUBLISHED) {
      this.toastService.info('This template version has already been published.');
      return;
    }

    this.isLoading.set(true);
    this.templateService.publishTemplateVersion(templateData.id, version.id).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.toastService.success('Template version published successfully.');
        this.onPublished.emit();
        // Reload version to update status
        this.loadLatestVersion();
      },
      error: (error) => {
        console.error('Error publishing template version:', error);
        this.isLoading.set(false);
        let errorMsg = 'Failed to publish template version.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.toastService.error(errorMsg);
      }
    });
  }

  onDeleteClick(): void {
    const templateData = this.template();
    if (!templateData?.id) {
      this.toastService.error('Invalid template data.');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${templateData.name}"? This action cannot be undone.`)) {
      return;
    }

    this.isLoading.set(true);
    this.templateService.deleteTemplate(templateData.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toastService.success('Template deleted successfully.');
        this.onDeleted.emit();
        this.onClose.emit();
      },
      error: (error) => {
        console.error('Error deleting template:', error);
        this.isLoading.set(false);
        let errorMsg = 'Failed to delete template.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.toastService.error(errorMsg);
      }
    });
  }

  close(): void {
    this.onClose.emit();
  }

  getFieldTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'text': 'Text',
      'email': 'Email',
      'number': 'Number',
      'date': 'Date',
      'binary': 'Yes/No',
      'textarea': 'Long Text'
    };
    return labels[type] || type;
  }

  getFieldBadgeClass(type: string): string {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    const typeClasses: Record<string, string> = {
      'text': 'bg-blue-100 text-blue-800',
      'email': 'bg-purple-100 text-purple-800',
      'number': 'bg-green-100 text-green-800',
      'date': 'bg-yellow-100 text-yellow-800',
      'binary': 'bg-pink-100 text-pink-800',
      'textarea': 'bg-indigo-100 text-indigo-800'
    };
    return `${baseClass} ${typeClasses[type] || 'bg-gray-100 text-gray-800'}`;
  }

  getStatusBadgeClass(status: TemplateVersionStatus): string {
    const baseClass = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case TemplateVersionStatus.PUBLISHED:
        return `${baseClass} bg-green-100 text-green-800`;
      case TemplateVersionStatus.DRAFT:
        return `${baseClass} bg-yellow-100 text-yellow-800`;
      case TemplateVersionStatus.ARCHIVED:
        return `${baseClass} bg-gray-100 text-gray-800`;
      default:
        return `${baseClass} bg-gray-100 text-gray-800`;
    }
  }

  getFieldTypeIcon(type: string): string {
    switch (type) {
      case FieldType.TEXT:
        return 'M4 6h16M4 12h16M4 18h16';
      case FieldType.EMAIL:
        return 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z';
      case FieldType.NUMBER:
        return 'M7 20l4-16m6 0l-4 16M6 9h14M4 15h14';
      case FieldType.DATE:
        return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
      case FieldType.BINARY:
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case FieldType.TEXTAREA:
        return 'M4 6h16M4 10h16M4 14h16M4 18h16';
      default:
        return 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z';
    }
  }
}
