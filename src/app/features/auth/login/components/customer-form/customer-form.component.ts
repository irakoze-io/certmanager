import { Component, input, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './customer-form.component.html',
  styleUrl: './customer-form.component.css'
})
export class CustomerFormComponent {
  form = input.required<FormGroup>();
  isLoading = input.required<boolean>();
  
  onSubmit = output<void>();

  onFormSubmit(): void {
    this.onSubmit.emit();
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.form().get(fieldName);
    return !!(field?.invalid && field.touched);
  }

  getFieldError(fieldName: string): string | null {
    const field = this.form().get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return this.getFieldLabel(fieldName) + ' is required';
      }
      if (field.errors['pattern']) {
        return 'Please enter a valid domain';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be greater than 0`;
      }
    }
    return null;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      name: 'Name',
      domain: 'Domain',
      maxUsers: 'Max Users',
      maxCertificatesPerMonth: 'Max Certificates per Month'
    };
    return labels[fieldName] || fieldName;
  }
}

