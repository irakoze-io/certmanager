import {Component, OnInit, input, output, signal, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {TemplateService} from '../../../../core/services/template.service';
import {CreateTemplateRequest, TemplateResponse} from '../../../../core/models/template.model';

// Predefined codes and categories
export const TEMPLATE_CODES = [
    'BASIC',
    'ADVANCED',
    'PROFESSIONAL',
    'MASTERY',
    'ACHIEVEMENT',
    'EXCELLENCE',
    'PARTICIPATION',
    'VERIFICATION',
    'COMPLIANCE',
    'COMPLETION',
    'GENERIC',
    'CUSTOM',
  ]
;

export const TEMPLATE_CATEGORIES = [
  'Education',
  'Professional Development',
  'Training',
  'Certification',
  'Achievement',
  'Participation',
  'Recognition',
  'Skills'
];

@Component({
  selector: 'app-template-create-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './template-create-form.component.html',
  styleUrl: './template-create-form.component.css'
})
export class TemplateCreateFormComponent implements OnInit {
  customerId = input.required<number>();
  template = input<TemplateResponse | undefined>(undefined); // Optional: for editing
  
  onSuccess = output<void>();
  onCancel = output<void>();

  form!: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  isEditMode = signal<boolean>(false);

  readonly codes = TEMPLATE_CODES;
  readonly categories = TEMPLATE_CATEGORIES;

  constructor(
    private fb: FormBuilder,
    private templateService: TemplateService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      code: ['', [Validators.required]],
      description: ['', [Validators.maxLength(500)]],
      category: ['', [Validators.required]]
    });

    // Re-initialize form data when template input changes
    effect(() => {
      const templateData = this.template();
      if (templateData) {
        this.initializeFormData(templateData);
      } else {
        this.resetForm();
      }
    });
  }

  ngOnInit(): void {
    const templateData = this.template();
    if (templateData) {
      this.initializeFormData(templateData);
    } else {
      this.resetForm();
    }
  }

  private initializeFormData(template: TemplateResponse): void {
    this.isEditMode.set(true);
    const category = template.metadata?.['category'] || '';
    
    this.form.patchValue({
      name: template.name || '',
      code: template.code || '',
      description: template.description || '',
      category: category || (this.categories.length > 0 ? this.categories[0] : '')
    });
    
    this.errorMessage.set(null);
  }

  private resetForm(): void {
    // Reset form to initial state
    this.isEditMode.set(false);
    this.form.reset();
    // Set default code if available
    if (this.codes.length > 0) {
      this.form.patchValue({code: this.codes[0]});
    }
    // Set default category if available
    if (this.categories.length > 0) {
      this.form.patchValue({category: this.categories[0]});
    }
    this.errorMessage.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.markFormGroupTouched(this.form);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValue = this.form.value;
    const templateData = this.template();

    if (this.isEditMode() && templateData) {
      // Update existing template
      const updateRequest: CreateTemplateRequest = {
        customerId: this.customerId(),
        name: formValue.name,
        code: formValue.code,
        description: formValue.description || undefined,
        currentVersion: templateData.currentVersion,
        metadata: {
          category: formValue.category
        }
      };

      this.templateService.updateTemplate(templateData.id, updateRequest).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.onSuccess.emit();
        },
        error: (error) => {
          this.isLoading.set(false);
          const errorMsg = error?.error?.message || error?.message || 'Failed to update template. Please try again.';
          this.errorMessage.set(errorMsg);
        }
      });
    } else {
      // Create new template
      const request: CreateTemplateRequest = {
        customerId: this.customerId(),
        name: formValue.name,
        code: formValue.code,
        description: formValue.description || undefined,
        currentVersion: 1,
        metadata: {
          category: formValue.category
        }
      };

      this.templateService.createTemplateWithVersion(request).subscribe({
        next: () => {
          this.isLoading.set(false);
          // Reset form after successful submission
          this.resetForm();
          this.onSuccess.emit();
        },
        error: (error) => {
          this.isLoading.set(false);
          const errorMsg = error?.error?.message || error?.message || 'Failed to create template. Please try again.';
          this.errorMessage.set(errorMsg);
        }
      });
    }
  }

  onCancelClick(): void {
    // Reset form when canceling
    this.resetForm();
    this.onCancel.emit();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string | null {
    const control = this.form.get(fieldName);
    if (control && control.invalid && control.touched) {
      if (control.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (control.errors?.['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['minlength'].requiredLength} characters`;
      }
      if (control.errors?.['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${control.errors['maxlength'].requiredLength} characters`;
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Template name',
      code: 'Code',
      description: 'Description',
      category: 'Category'
    };
    return labels[fieldName] || fieldName;
  }
}

