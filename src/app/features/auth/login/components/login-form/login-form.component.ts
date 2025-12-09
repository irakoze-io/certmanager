import { Component, input, output, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css'
})
export class LoginFormComponent {
  form = input.required<FormGroup>();
  isLoading = input.required<boolean>();
  showPassword = signal(false);
  
  onSubmit = output<void>();

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

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
      if (field.errors['email']) {
        return 'Please enter a valid email address';
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
      tenantId: 'Tenant ID',
      email: 'Email',
      password: 'Password'
    };
    return labels[fieldName] || fieldName;
  }
}

