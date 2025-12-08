import { Component, OnInit, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CertificateService } from '../../../../core/services/certificate.service';
import { TemplateService } from '../../../../core/services/template.service';
import { ToastService } from '../../../../core/services/toast.service';
import { 
  CertificateResponse, 
  CertificateStatus,
  GenerateCertificateRequest
} from '../../../../core/models/certificate.model';
import { TemplateVersionResponse, FieldSchemaField, FieldType } from '../../../../core/models/template.model';
import { formatDate } from '../../../../core/utils/date.util';

@Component({
  selector: 'app-certificate-view',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './certificate-view.component.html',
  styleUrl: './certificate-view.component.css'
})
export class CertificateViewComponent implements OnInit {
  certificateId = input.required<string>();
  
  onClose = output<void>();
  onUpdated = output<void>();

  certificate = signal<CertificateResponse | null>(null);
  templateVersion = signal<TemplateVersionResponse | null>(null);
  isLoading = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  
  form!: FormGroup;
  fieldSchema = signal<Record<string, FieldSchemaField>>({});
  recipientDataForm!: FormGroup;

  FieldType = FieldType; // Expose to template
  formatDate = formatDate; // Expose to template
  Object = Object; // Expose Object to template

  constructor(
    private fb: FormBuilder,
    private certificateService: CertificateService,
    private templateService: TemplateService,
    private toastService: ToastService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadCertificate();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      certificateNumber: ['', Validators.required],
      recipientData: this.fb.group({})
    });
    
    this.recipientDataForm = this.form.get('recipientData') as FormGroup;
  }

  loadCertificate(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    this.certificateService.getCertificateById(this.certificateId()).subscribe({
      next: (certificate) => {
        this.certificate.set(certificate);
        
        this.populateForm(certificate);
        
        // Try to load template version to get fieldSchema
        // Note: We need to find the template that has this version
        // For now, we'll build the form from existing recipientData
        if (certificate.recipientData) {
          this.buildFormFromRecipientData(certificate.recipientData);
        }
        
        // Try to find template version by loading all templates and their versions
        this.loadTemplateVersionForCertificate(certificate.templateVersionId);
        
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading certificate:', error);
        this.isLoading.set(false);
        let errorMsg = 'Failed to load certificate.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.errorMessage.set(errorMsg);
        this.toastService.error(errorMsg);
      }
    });
  }

  populateForm(certificate: CertificateResponse): void {
    this.form.patchValue({
      certificateNumber: certificate.certificateNumber
    });
  }

  loadTemplateVersionForCertificate(versionId: string): void {
    // Try to find the template version by loading all templates
    this.templateService.getAllTemplates().subscribe({
      next: (templates) => {
        let found = false;
        for (const template of templates) {
          this.templateService.getTemplateVersions(template.id).subscribe({
            next: (versions) => {
              if (!found) {
                const version = versions.find(v => v.id === versionId);
                if (version) {
                  found = true;
                  this.templateVersion.set(version);
                  if (version.fieldSchema) {
                    this.fieldSchema.set(version.fieldSchema);
                    const cert = this.certificate();
                    if (cert?.recipientData) {
                      this.buildRecipientDataForm(version.fieldSchema, cert.recipientData);
                    }
                  }
                }
              }
            }
          });
        }
      }
    });
  }

  buildFormFromRecipientData(recipientData: Record<string, any>): void {
    const formControls: Record<string, any> = {};
    
    Object.entries(recipientData).forEach(([fieldName, value]) => {
      formControls[fieldName] = this.fb.control(value || '', []);
    });
    
    this.recipientDataForm = this.fb.group(formControls);
    this.form.setControl('recipientData', this.recipientDataForm);
  }

  buildRecipientDataForm(schema: Record<string, FieldSchemaField>, existingData: Record<string, any>): void {
    const formControls: Record<string, any> = {};
    
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
      
      const existingValue = existingData?.[fieldName] || (fieldDef.required ? '' : null);
      formControls[fieldName] = this.fb.control(existingValue, validators);
    });
    
    this.recipientDataForm = this.fb.group(formControls);
    this.form.setControl('recipientData', this.recipientDataForm);
  }

  enableEdit(): void {
    const cert = this.certificate();
    if (cert?.status === CertificateStatus.ISSUED) {
      this.toastService.error('Issued certificates cannot be edited.');
      return;
    }
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    const cert = this.certificate();
    if (cert) {
      this.populateForm(cert);
      if (cert.recipientData) {
        if (this.templateVersion()?.fieldSchema) {
          this.buildRecipientDataForm(this.templateVersion()!.fieldSchema!, cert.recipientData);
        } else {
          this.buildFormFromRecipientData(cert.recipientData);
        }
      }
    }
    this.isEditing.set(false);
  }

  saveChanges(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    const cert = this.certificate();
    if (!cert || !cert.id) {
      this.toastService.error('Invalid certificate data.');
      return;
    }

    if (cert.status === CertificateStatus.ISSUED) {
      this.toastService.error('Issued certificates cannot be edited.');
      return;
    }

    this.isSaving.set(true);
    const formValue = this.form.value;
    
    const updateRequest: Partial<GenerateCertificateRequest> = {
      certificateNumber: formValue.certificateNumber || null,
      recipientData: formValue.recipientData
    };

    this.certificateService.updateCertificate(cert.id, updateRequest).subscribe({
      next: (updatedCertificate) => {
        this.certificate.set(updatedCertificate);
        this.isEditing.set(false);
        this.isSaving.set(false);
        this.toastService.success('Certificate updated successfully.');
        this.onUpdated.emit();
      },
      error: (error) => {
        console.error('Error updating certificate:', error);
        this.isSaving.set(false);
        let errorMsg = 'Failed to update certificate.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        this.toastService.error(errorMsg);
      }
    });
  }

  downloadCertificate(): void {
    const cert = this.certificate();
    if (!cert?.id) return;
    
    if (cert.status !== CertificateStatus.ISSUED) {
      this.toastService.warning('Certificate is not ready for download. Status: ' + cert.status);
      return;
    }
    
    this.certificateService.getDownloadUrl(cert.id, 60).subscribe({
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

  getStatusClass(status: CertificateStatus): string {
    const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium border';
    switch (status) {
      case CertificateStatus.ISSUED:
        return `${baseClasses} bg-green-100 text-green-800 border-green-200`;
      case CertificateStatus.PENDING:
      case CertificateStatus.PROCESSING:
        return `${baseClasses} bg-yellow-100 text-yellow-800 border-yellow-200`;
      case CertificateStatus.FAILED:
        return `${baseClasses} bg-red-100 text-red-800 border-red-200`;
      case CertificateStatus.REVOKED:
        return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 border-gray-200`;
    }
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

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
