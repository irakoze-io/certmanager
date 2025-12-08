import {Component, OnInit, input, output, signal, effect} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormBuilder, FormGroup, Validators, ReactiveFormsModule} from '@angular/forms';
import {TemplateService} from '../../../../core/services/template.service';
import {CreateTemplateRequest} from '../../../../core/models/template.model';

// Predefined codes and categories
export const TEMPLATE_CODES = [
    'CERT - BASIC',
    'CERT - ADVANCED',
    'CERT - PROFESSIONAL',
    'CERT - MASTERY',
    'CERT - ACHIEVEMENT',
    'CERT - EXCELLENCE',
    'CERT - PARTICIPATION',
    'CERT - VERIFICATION',
    'CERT - COMPLIANCE',
    'CERT - COMPLETION',
    'CERT - GENERIC',
    'CERT - CUSTOM',
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
  onSuccess = output<void>();
  onCancel = output<void>();

  form!: FormGroup;
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

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
  }

  ngOnInit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    // Reset form to initial state
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

    this.templateService.createTemplate(request).subscribe({
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

