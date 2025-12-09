import { Component, OnInit, OnDestroy, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CertificateService } from '../../../../core/services/certificate.service';
import { TemplateService } from '../../../../core/services/template.service';
import { ToastService } from '../../../../core/services/toast.service';
import { 
  GenerateCertificateRequest, 
  CertificateResponse, 
  CertificateStatus 
} from '../../../../core/models/certificate.model';
import { TemplateResponse, TemplateVersionResponse, TemplateVersionStatus, FieldSchemaField, FieldType } from '../../../../core/models/template.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-certificate-create-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './certificate-create-form.component.html',
  styleUrl: './certificate-create-form.component.css'
})
export class CertificateCreateFormComponent implements OnInit, OnDestroy {
  FieldType = FieldType; // Expose to template
  Object = Object; // Expose Object to template
  
  onSuccess = output<void>();
  onCancelClick = output<void>();
  
  form!: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  
  // Template and version selection
  templates = signal<TemplateResponse[]>([]);
  selectedTemplate = signal<TemplateResponse | null>(null);
  templateVersions = signal<TemplateVersionResponse[]>([]);
  selectedVersion = signal<TemplateVersionResponse | null>(null);
  
  // Certificate generation
  generatedCertificate = signal<CertificateResponse | null>(null);
  isPolling = signal<boolean>(false);
  pollingSubscription?: Subscription;
  
  // Field schema for dynamic form
  fieldSchema = signal<Record<string, FieldSchemaField>>({});
  recipientDataForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private certificateService: CertificateService,
    private templateService: TemplateService,
    private toastService: ToastService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadTemplates();
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      templateId: ['', Validators.required],
      templateVersionId: ['', Validators.required],
      certificateNumber: [''], // Leave empty - will be generated on submit if not provided
      synchronous: [false], // Default to async
      recipientData: this.fb.group({})
    });
    
    this.recipientDataForm = this.form.get('recipientData') as FormGroup;
  }

  /**
   * Generate a unique 10-digit certificate number
   */
  private generateCertificateNumber(): string {
    // Generate a 10-digit number (ensuring it doesn't start with 0)
    const firstDigit = Math.floor(Math.random() * 9) + 1; // 1-9
    const remainingDigits = Math.floor(Math.random() * 1000000000); // 0-999999999
    return `${firstDigit}${remainingDigits.toString().padStart(9, '0')}`;
  }

  loadTemplates(): void {
    this.isLoading.set(true);
    this.templateService.getAllTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading templates:', error);
        this.toastService.error('Failed to load templates. Please try again.');
        this.isLoading.set(false);
      }
    });
  }

  onTemplateSelected(templateId: number): void {
    const template = this.templates().find(t => t.id === templateId);
    this.selectedTemplate.set(template || null);
    this.form.patchValue({ templateVersionId: '' });
    this.selectedVersion.set(null);
    this.fieldSchema.set({});
    this.clearRecipientDataForm();
    
    if (template) {
      this.loadTemplateVersions(template.id);
    }
  }

  loadTemplateVersions(templateId: number): void {
    this.isLoading.set(true);
    this.templateService.getTemplateVersions(templateId).subscribe({
      next: (versions) => {
        // Filter to only PUBLISHED versions
        const publishedVersions = versions.filter(v => v.status === TemplateVersionStatus.PUBLISHED);
        this.templateVersions.set(publishedVersions);
        this.isLoading.set(false);
        
        if (publishedVersions.length === 0) {
          this.toastService.warning('No published versions available for this template.');
        }
      },
      error: (error) => {
        console.error('Error loading template versions:', error);
        this.toastService.error('Failed to load template versions.');
        this.isLoading.set(false);
      }
    });
  }

  onVersionSelected(versionId: string): void {
    const version = this.templateVersions().find(v => v.id === versionId);
    this.selectedVersion.set(version || null);
    
    if (version && version.fieldSchema) {
      this.fieldSchema.set(version.fieldSchema);
      this.buildRecipientDataForm(version.fieldSchema);
    } else {
      this.fieldSchema.set({});
      this.clearRecipientDataForm();
    }
  }

  buildRecipientDataForm(schema: Record<string, FieldSchemaField>): void {
    const formControls: Record<string, AbstractControl> = {};
    
    Object.entries(schema).forEach(([fieldName, fieldDef]) => {
      const validators = [];
      
      if (fieldDef.required) {
        validators.push(Validators.required);
      }
      
      if (fieldDef.type === FieldType.EMAIL) {
        validators.push(Validators.email);
      }
      
      if (fieldDef.type === FieldType.NUMBER) {
        validators.push(Validators.pattern(/^-?\d*\.?\d+$/));
      }
      
      // Add custom validators based on field schema constraints
      // (minLength, maxLength, pattern would go here if available in FieldSchemaField)
      
      formControls[fieldName] = this.fb.control(fieldDef.required ? '' : null, validators);
    });
    
    this.recipientDataForm = this.fb.group(formControls);
    this.form.setControl('recipientData', this.recipientDataForm);
  }

  clearRecipientDataForm(): void {
    this.recipientDataForm = this.fb.group({});
    this.form.setControl('recipientData', this.recipientDataForm);
  }

  getFieldTypeLabel(type: FieldType): string {
    const labels: Record<FieldType, string> = {
      [FieldType.TEXT]: 'Text',
      [FieldType.EMAIL]: 'Email',
      [FieldType.NUMBER]: 'Number',
      [FieldType.DATE]: 'Date',
      [FieldType.BINARY]: 'Yes/No',
      [FieldType.TEXTAREA]: 'Long Text'
    };
    return labels[type] || type;
  }

  getFieldInputType(fieldType: FieldType): string {
    switch (fieldType) {
      case FieldType.EMAIL:
        return 'email';
      case FieldType.NUMBER:
        return 'number';
      case FieldType.DATE:
        return 'date';
      default:
        return 'text';
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    const formValue = this.form.value;
    const isSync = formValue.synchronous;
    
    // Generate 10-digit certificate number if not provided
    const certificateNumber = formValue.certificateNumber?.trim() || this.generateCertificateNumber();
    
    // Structure recipientData to match template placeholder format
    // Templates use {{recipient.name}}, {{recipient.email}}, or {{fieldName}} format
    // Wrap the flat recipientData in a 'recipient' object to match {{recipient.*}} placeholders
    const recipientData = {
      recipient: formValue.recipientData,
      ...formValue.recipientData // Also include flat fields for {{fieldName}} format
    };
    
    const request: GenerateCertificateRequest = {
      templateVersionId: formValue.templateVersionId,
      certificateNumber: certificateNumber,
      recipientData: recipientData,
      metadata: {},
      issuedAt: null,
      expiresAt: null,
      issuedBy: null,
      synchronous: isSync
    };

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.generatedCertificate.set(null);

    this.certificateService.generateCertificate(request).subscribe({
      next: (certificate) => {
        this.generatedCertificate.set(certificate);
        this.isLoading.set(false);
        
        if (isSync && certificate.status === CertificateStatus.ISSUED) {
          // Synchronous: Certificate is ready immediately
          this.toastService.success('Certificate generated successfully!');
          this.handleCertificateReady(certificate);
        } else if (!isSync && certificate.status === CertificateStatus.PENDING) {
          // Asynchronous: Start polling for status updates
          this.toastService.info('Certificate generation started. Processing in background...');
          this.startPolling(certificate.id);
        } else if (certificate.status === CertificateStatus.FAILED) {
          this.toastService.error('Certificate generation failed. Please try again.');
        }
      },
      error: (error) => {
        console.error('Certificate generation failed:', error);
        this.isLoading.set(false);
        let errorMsg = 'Failed to generate certificate.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.toastService.error(errorMsg);
        this.errorMessage.set(errorMsg);
      }
    });
  }

  startPolling(certificateId: string): void {
    this.isPolling.set(true);
    this.pollingSubscription = this.certificateService
      .pollCertificateStatus(certificateId, 2000, 30)
      .subscribe({
        next: (certificate) => {
          this.generatedCertificate.set(certificate);
          
          if (certificate.status === CertificateStatus.ISSUED) {
            this.toastService.success('Certificate generated successfully!');
            this.handleCertificateReady(certificate);
            this.stopPolling();
          } else if (certificate.status === CertificateStatus.FAILED) {
            this.toastService.error('Certificate generation failed. Please try again.');
            this.stopPolling();
          }
        },
        error: (error) => {
          console.error('Polling error:', error);
          this.toastService.error('Error checking certificate status.');
          this.stopPolling();
        }
      });
  }

  stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = undefined;
    }
    this.isPolling.set(false);
  }

  handleCertificateReady(certificate: CertificateResponse): void {
    // Certificate is ready, can be downloaded
    console.log('Certificate ready:', certificate);
    // Don't auto-close - let user download or manually close
  }

  downloadCertificate(): void {
    const certificate = this.generatedCertificate();
    if (!certificate?.id) return;
    
    if (certificate.status !== CertificateStatus.ISSUED) {
      this.toastService.warning('Certificate is not ready for download yet.');
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

  onCancel(): void {
    this.stopPolling();
    this.form.reset();
    this.generatedCertificate.set(null);
    this.selectedTemplate.set(null);
    this.selectedVersion.set(null);
    this.templateVersions.set([]);
    this.fieldSchema.set({});
    this.clearRecipientDataForm();
    this.onCancelClick.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getFieldError(fieldName: string): string | null {
    const control = this.recipientDataForm.get(fieldName);
    if (control && control.invalid && control.touched) {
      if (control.errors?.['required']) {
        return 'This field is required';
      }
      if (control.errors?.['email']) {
        return 'Please enter a valid email address';
      }
      if (control.errors?.['pattern']) {
        return 'Please enter a valid number';
      }
    }
    return null;
  }

  getStatusClass(status: CertificateStatus): string {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium';
    switch (status) {
      case CertificateStatus.ISSUED:
        return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
      case CertificateStatus.PENDING:
      case CertificateStatus.PROCESSING:
        return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
      case CertificateStatus.FAILED:
        return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
      case CertificateStatus.REVOKED:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
    }
  }
}
