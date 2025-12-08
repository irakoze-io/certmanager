import { Component, input, output, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { TemplateService } from '../../../../core/services/template.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TemplateResponse, TemplateVersionStatus } from '../../../../core/models/template.model';
import { FieldType, FieldSchemaField } from '../../../../core/models/template.model';

@Component({
  selector: 'app-template-enrich-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './template-enrich-form.component.html',
  styleUrl: './template-enrich-form.component.css'
})
export class TemplateEnrichFormComponent implements OnInit {
  template = input.required<TemplateResponse>();
  
  onSubmit = output<void>();
  onCancel = output<void>();

  enrichForm!: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  nextVersion = signal<number>(1);

  // User-friendly field types
  fieldTypes = [
    { value: FieldType.TEXT, label: 'Text' },
    { value: FieldType.EMAIL, label: 'Email' },
    { value: FieldType.NUMBER, label: 'Number' },
    { value: FieldType.DATE, label: 'Date' },
    { value: FieldType.BINARY, label: 'Yes/No' },
    { value: FieldType.TEXTAREA, label: 'Long Text' }
  ];

  // Page size options
  pageSizes = ['A4', 'Letter', 'Legal', 'A3', 'A5'];
  
  // Orientation options
  orientations = [
    { value: 'portrait', label: 'Portrait' },
    { value: 'landscape', label: 'Landscape' }
  ];

  constructor(
    private fb: FormBuilder,
    private templateService: TemplateService,
    private authService: AuthService
  ) {
    this.initializeForm();
    
    // Re-initialize form data when template input changes
    effect(() => {
      const templateData = this.template();
      if (templateData && templateData.id) {
        this.initializeFormData();
      }
    });
  }

  ngOnInit(): void {
    this.initializeFormData();
  }

  private initializeFormData(): void {
    const templateData = this.template();
    
    if (!templateData || !templateData.id) {
      console.error('Invalid template data:', templateData);
      this.errorMessage.set('Invalid template data. Please close and try again.');
      return;
    }
    
    // Reset form to ensure clean state
    this.enrichForm.reset();
    
    // Set template ID in form
    this.enrichForm.patchValue({
      templateId: templateData.id
    });
    
    // Clear any previous error
    this.errorMessage.set(null);
    
    // Load latest version number
    this.templateService.getLatestVersionNumber(templateData.id).subscribe({
      next: (latestVersion) => {
        this.nextVersion.set(latestVersion + 1);
      },
      error: (error) => {
        console.error('Error fetching latest version:', error);
        // Default to version 1 if error
        this.nextVersion.set(1);
      }
    });

    // Initialize HTML content with a basic template
    const defaultHtml = `<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate</title>
</head>
<body>
  <div class="certificate-container">
    <h1>Certificate of Completion</h1>
    <p>This certifies that <strong>{{name}}</strong> has successfully completed the course.</p>
    <!-- Add more fields using {{fieldName}} syntax -->
  </div>
</body>
</html>`;

    const defaultCss = `body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 20px;
}

.certificate-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
  border: 2px solid #333;
  text-align: center;
}

h1 {
  color: #26648E;
  margin-bottom: 20px;
}

p {
  font-size: 16px;
  line-height: 1.6;
}`;

    this.enrichForm.patchValue({
      htmlContent: defaultHtml,
      cssStyles: defaultCss,
      settings: {
        pageSize: 'A4',
        orientation: 'portrait'
      }
    });
  }

  private initializeForm(): void {
    this.enrichForm = this.fb.group({
      templateId: [{ value: '', disabled: true }, Validators.required],
      htmlContent: ['', Validators.required],
      cssStyles: [''],
      settings: this.fb.group({
        pageSize: ['A4'],
        orientation: ['portrait']
      }),
      fields: this.fb.array([])
    });
  }

  get fieldsArray(): FormArray {
    return this.enrichForm.get('fields') as FormArray;
  }

  addField(): void {
    const fieldGroup = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z][a-zA-Z0-9_]*$/)]],
      type: [FieldType.TEXT, Validators.required],
      required: [false],
      label: ['', Validators.required]
    });

    this.fieldsArray.push(fieldGroup);
  }

  removeField(index: number): void {
    this.fieldsArray.removeAt(index);
  }

  getFieldTypeLabel(type: FieldType): string {
    const fieldType = this.fieldTypes.find(ft => ft.value === type);
    return fieldType ? fieldType.label : type;
  }

  onSubmitForm(): void {
    if (this.enrichForm.invalid) {
      this.markFormGroupTouched(this.enrichForm);
      this.errorMessage.set('Please fill in all required fields correctly.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValue = this.enrichForm.getRawValue();
    const currentUser = this.authService.currentUser();

    // Build field schema
    const fieldSchema: Record<string, FieldSchemaField> = {};
    formValue.fields.forEach((field: any) => {
      fieldSchema[field.name] = {
        name: field.name,
        type: field.type,
        required: field.required,
        label: field.label
      };
    });

    // Build request
    const request = {
      templateId: this.template().id,
      version: this.nextVersion(),
      htmlContent: formValue.htmlContent,
      fieldSchema: Object.keys(fieldSchema).length > 0 ? fieldSchema : undefined,
      cssStyles: formValue.cssStyles || undefined,
      settings: formValue.settings,
      status: TemplateVersionStatus.DRAFT,
      createdBy: currentUser?.id || undefined
    };

    this.templateService.createTemplateVersion(this.template().id, request).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.onSubmit.emit();
      },
      error: (error) => {
        console.error('Error creating template version:', error);
        this.isLoading.set(false);
        
        // Extract meaningful error message
        let errorMsg = 'Failed to create template version.';
        if (error?.error?.message) {
          errorMsg = error.error.message;
        } else if (error?.message) {
          errorMsg = error.message;
        }
        
        this.errorMessage.set(errorMsg);
      }
    });
  }

  onCancelClick(): void {
    this.onCancel.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((arrayControl: any) => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      }
    });
  }

  getTemplateDisplay(): string {
    const templateData = this.template();
    const version = this.nextVersion();
    return `${templateData.code} ◦ Version Number v${version}`;
  }
}

