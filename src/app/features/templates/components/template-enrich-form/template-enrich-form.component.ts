import { Component, input, output, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { TemplateService } from '../../../../core/services/template.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TemplateResponse, TemplateVersionStatus, TemplateVersionResponse } from '../../../../core/models/template.model';
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
  versionId = input<string | undefined>(undefined); // Optional: if provided, load this specific version instead of latest
  
  onSubmit = output<void>();
  onCancel = output<void>();

  enrichForm!: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  nextVersion = signal<number>(1);
  existingVersion = signal<TemplateVersionResponse | null>(null);
  existingFields = signal<Array<{ name: string; type: FieldType; label: string }>>([]);
  addedFields = signal<Array<{ name: string; type: FieldType; label: string }>>([]);
  editingField = signal<{ name: string; type: FieldType; label: string } | null>(null);

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
    this.addedFields.set([]); // Clear added fields list
    this.editingField.set(null); // Clear editing state
    
    // Set template ID in form
    this.enrichForm.patchValue({
      templateId: templateData.id
    });
    
    // Clear any previous error
    this.errorMessage.set(null);
    
    // Load existing template version (specific version if versionId provided, otherwise latest)
    const versionId = this.versionId();
    const versionObservable = versionId && templateData.id
      ? this.templateService.getTemplateVersionById(templateData.id, versionId)
      : this.templateService.getLatestTemplateVersion(templateData.id);
    
    versionObservable.subscribe({
      next: (version) => {
        if (version) {
          this.existingVersion.set(version);
          this.nextVersion.set(typeof version.version === 'number' ? version.version : parseInt(version.version.toString(), 10));
          
          // Extract existing fields from fieldSchema
          if (version.fieldSchema) {
            const fields: Array<{ name: string; type: FieldType; label: string }> = [];
            Object.keys(version.fieldSchema).forEach(fieldName => {
              const field = version.fieldSchema![fieldName];
              fields.push({
                name: fieldName,
                type: field.type,
                label: field.label || fieldName
              });
            });
            this.existingFields.set(fields);
          }
          
          // Load existing HTML content and CSS
          if (version.htmlContent) {
            this.enrichForm.patchValue({
              htmlContent: version.htmlContent,
              cssStyles: version.cssStyles || ''
            });
          }
        } else {
          // No existing version, will create new one
          this.nextVersion.set(1);
        }
      },
      error: (error) => {
        console.error('Error fetching latest template version:', error);
        // Default to version 1 if error
        this.nextVersion.set(1);
      }
    });

    // Initialize HTML content with a basic template
    const defaultHtml = `<html>
<head>
  <meta charset="UTF-8"/>
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
      cssStyles: defaultCss, // Keep CSS in form but hidden from user
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
        pageSize: ['A4'], // Always A4, not shown to user
        orientation: ['portrait']
      }),
      fields: this.fb.array([])
    });
  }

  get fieldsArray(): FormArray {
    return this.enrichForm.get('fields') as FormArray;
  }

  addField(): void {
    // Limit to 5 new fields
    if (this.fieldsArray.length >= 5) {
      this.errorMessage.set('Maximum of 5 new fields allowed. Please add existing fields to htmlContent before adding more.');
      return;
    }

    const fieldGroup = this.fb.group({
      name: ['', [Validators.required]],
      type: [FieldType.TEXT, Validators.required]
    });

    this.fieldsArray.push(fieldGroup);
  }

  /**
   * Converts user-friendly field name (e.g., "Home Address") to camelCase field name (e.g., "homeAddress")
   */
  private convertToFieldName(userInput: string): string {
    return userInput
      .trim()
      .split(/\s+/)
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  }

  addFieldToHtmlContent(index: number): void {
    const field = this.fieldsArray.at(index);
    if (!field || !field.get('name')?.valid) {
      return;
    }

    const fieldValue = field.value;
    if (!fieldValue.name || fieldValue.name.trim() === '') {
      return;
    }

    // Convert user input to camelCase field name
    const fieldName = this.convertToFieldName(fieldValue.name);
    const label = fieldValue.name.trim(); // Use original input as label
    
    // Add to added fields list for badge display
    const currentAddedFields = this.addedFields();
    const newField = {
      name: fieldName,
      type: fieldValue.type,
      label: label
    };
    
    // Check if field name already exists (avoid duplicates)
    const exists = currentAddedFields.some(f => f.name === fieldName);
    if (!exists) {
      this.addedFields.set([...currentAddedFields, newField]);
    }
    
    // Remove the field from the form array
    this.fieldsArray.removeAt(index);
    
    // Update HTML content with all added fields
    this.updateHtmlContent();
  }

  isFieldAdded(index: number): boolean {
    const field = this.fieldsArray.at(index);
    if (!field) return false;
    
    const fieldValue = field.value;
    if (!fieldValue.name || fieldValue.name.trim() === '') {
      return false;
    }
    
    const fieldName = this.convertToFieldName(fieldValue.name);
    return this.addedFields().some(f => f.name === fieldName);
  }

  removeField(index: number): void {
    this.fieldsArray.removeAt(index);
  }

  removeAddedField(fieldName: string): void {
    // Remove from added fields list by field name
    const currentAddedFields = this.addedFields();
    this.addedFields.set(currentAddedFields.filter(f => f.name !== fieldName));
    
    // Update HTML content
    this.updateHtmlContent();
  }

  editExistingField(field: { name: string; type: FieldType; label: string }): void {
    this.editingField.set({ ...field });
  }

  updateEditingFieldLabel(newLabel: string): void {
    const current = this.editingField();
    if (current) {
      this.editingField.set({ ...current, label: newLabel.trim() });
    }
  }

  updateEditingFieldType(newType: FieldType): void {
    const current = this.editingField();
    if (current) {
      this.editingField.set({ ...current, type: newType });
    }
  }

  saveEditingField(): void {
    const editing = this.editingField();
    if (!editing) return;

    // Update the existing field in the existingFields array
    const currentFields = this.existingFields();
    const updatedFields = currentFields.map(field => 
      field.name === editing.name ? { ...editing } : field
    );
    this.existingFields.set(updatedFields);

    // Update HTML content
    this.updateHtmlContent();

    // Clear editing state
    this.editingField.set(null);
  }

  cancelEditingField(): void {
    this.editingField.set(null);
  }

  removeExistingField(fieldName: string): void {
    // Remove from existing fields list
    const currentFields = this.existingFields();
    this.existingFields.set(currentFields.filter(f => f.name !== fieldName));
    
    // Update HTML content
    this.updateHtmlContent();
  }

  getFieldTypeIcon(type: FieldType): string {
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

  getFieldTypeLabel(type: FieldType): string {
    const fieldType = this.fieldTypes.find(ft => ft.value === type);
    return fieldType ? fieldType.label : type;
  }

  onSubmitForm(): void {
    // Check if htmlContent is valid (required)
    if (!this.enrichForm.get('htmlContent')?.value || this.enrichForm.get('htmlContent')?.value.trim() === '') {
      this.errorMessage.set('HTML content is required. Please add at least one field.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValue = this.enrichForm.getRawValue();
    const currentUser = this.authService.currentUser();

    // Build field schema from added fields
    const fieldSchema: Record<string, FieldSchemaField> = {};
    
    // Add existing fields
    this.existingFields().forEach(field => {
      fieldSchema[field.name] = {
        name: field.name,
        type: field.type,
        required: false,
        label: field.label
      };
    });
    
    // Add newly added fields
    this.addedFields().forEach(field => {
      fieldSchema[field.name] = {
        name: field.name,
        type: field.type,
        required: false,
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

    const existingVersion = this.existingVersion();
    
    if (existingVersion && existingVersion.id) {
      // Update existing version
      this.templateService.updateTemplateVersion(
        this.template().id,
        existingVersion.id,
        {
          htmlContent: formValue.htmlContent,
          fieldSchema: Object.keys(fieldSchema).length > 0 ? fieldSchema : undefined,
          cssStyles: formValue.cssStyles || undefined,
          settings: formValue.settings,
          createdBy: currentUser?.id || undefined
        }
      ).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.onSubmit.emit();
        },
        error: (error) => {
          console.error('Error updating template version:', error);
          this.isLoading.set(false);
          
          // Extract meaningful error message
          let errorMsg = 'Failed to update template version.';
          if (error?.error?.message) {
            errorMsg = error.error.message;
          } else if (error?.message) {
            errorMsg = error.message;
          }
          
          this.errorMessage.set(errorMsg);
        }
      });
    } else {
      // Create new version
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

  updateHtmlContent(): void {
    // Build HTML content with only fields that have been added
    let htmlBody = '  <div class="certificate-container">\n';
    htmlBody += '    <h1>Certificate of Completion</h1>\n';
    
    // Combine existing fields and added fields
    const allFields = [...this.existingFields(), ...this.addedFields()];
    
    if (allFields.length > 0) {
      allFields.forEach((field) => {
        htmlBody += `    <p><strong>${field.label}:</strong> {{${field.name}}}</p>\n`;
      });
    } else {
      htmlBody += '    <p>This certifies that the recipient has successfully completed the course.</p>\n';
    }
    
    htmlBody += '  </div>';

    const htmlContent = `<html>
<head>
  <meta charset="UTF-8"/>
  <title>Certificate</title>
</head>
<body>
${htmlBody}
</body>
</html>`;

    this.enrichForm.patchValue({ htmlContent }, { emitEvent: false });
  }
}

