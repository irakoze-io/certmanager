import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { LoginRequest } from '../../../core/models/auth.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  returnUrl = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Get return URL from query params or default to dashboard
    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');

    // Initialize form with validators
    this.loginForm = this.fb.group({
      tenantId: ['', [Validators.required, Validators.min(1)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValue = this.loginForm.value;
    const loginRequest: LoginRequest = {
      email: formValue.email,
      password: formValue.password
    };

    this.authService.login(formValue.tenantId, loginRequest).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Login successful - redirect to return URL or dashboard
          const redirectUrl = this.returnUrl() || '/dashboard';
          this.router.navigate([redirectUrl]);
        } else {
          this.errorMessage.set(response.message || 'Login failed');
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        console.error('Login error:', error);
        this.errorMessage.set(
          error.error?.message || 
          error.message || 
          'Login failed. Please check your credentials and try again.'
        );
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Get error message for a form field
   */
  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
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

  /**
   * Get human-readable field label
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      tenantId: 'Tenant ID',
      email: 'Email',
      password: 'Password'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if a field has errors and is touched
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field?.invalid && field.touched);
  }
}
