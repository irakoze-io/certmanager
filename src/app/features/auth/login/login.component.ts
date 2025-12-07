import {Component, signal} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {CommonModule} from '@angular/common';
import {AuthService} from '../../../core/services/auth.service';
import {CustomerService} from '../../../core/services/customer.service';
import {LoginRequest} from '../../../core/models/auth.model';
import {CreateCustomerRequest, CustomerStatus} from '../../../core/models/customer.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  activeTab = signal<'login' | 'customer'>('login');
  loginForm: FormGroup;
  customerForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  returnUrl = signal<string | null>(null);
  showPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private customerService: CustomerService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Get return URL from query params or default to dashboard
    this.returnUrl.set(this.route.snapshot.queryParams['returnUrl'] || '/dashboard');

    // Initialize login form
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });

    // Initialize customer form
    this.customerForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      domain: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/)]],
      maxUsers: [10, [Validators.required, Validators.min(1)]],
      maxCertificatesPerMonth: [100, [Validators.required, Validators.min(1)]]
    });
  }

  /**
   * Switch between login and customer creation tabs
   */
  setActiveTab(tab: 'login' | 'customer'): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }

  /**
   * Toggle password visibility
   */
  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  /**
   * Handle login form submission
   */
  onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue = this.loginForm.value;
    const loginRequest: LoginRequest = {
      email: formValue.email,
      password: formValue.password
    };

    // Extract tenant ID from email domain or use default
    // For now, we'll need tenant ID - this might need to be adjusted based on your auth flow
    // Assuming tenant ID is 1 for now, but you may want to add a tenant selector
    const tenantId = 1; // TODO: Add tenant selection UI or extract from domain

    this.authService.login(tenantId, loginRequest).subscribe({
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
   * Handle customer creation form submission
   */
  onCustomerSubmit(): void {
    if (this.customerForm.invalid) {
      this.markFormGroupTouched(this.customerForm);
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue = this.customerForm.value;
    const customerRequest: CreateCustomerRequest = {
      name: formValue.name,
      domain: formValue.domain,
      maxUsers: formValue.maxUsers,
      maxCertificatesPerMonth: formValue.maxCertificatesPerMonth,
      status: CustomerStatus.TRIAL
    };

    this.customerService.createCustomer(customerRequest).subscribe({
      next: (response) => {
        this.successMessage.set('Cliente criado com sucesso! Você já pode fazer login.');
        this.isLoading.set(false);
        // Reset form
        this.customerForm.reset({
          maxUsers: 10,
          maxCertificatesPerMonth: 100
        });
        // Switch to login tab after 2 seconds
        setTimeout(() => {
          this.setActiveTab('login');
        }, 2000);
      },
      error: (error) => {
        console.error('Customer creation error:', error);
        this.errorMessage.set(
          error.error?.message ||
          error.message ||
          'Failed to create customer. Please try again.'
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
    const form = this.activeTab() === 'login' ? this.loginForm : this.customerForm;
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} é obrigatório`;
      }
      if (field.errors['email']) {
        return 'Por favor, insira um endereço de e-mail válido';
      }
      if (field.errors['pattern']) {
        return 'Por favor, insira um domínio válido';
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} deve ter pelo menos ${field.errors['minlength'].requiredLength} caracteres`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} deve ser maior que 0`;
      }
    }
    return null;
  }

  /**
   * Get human-readable field label
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      email: 'E-mail',
      password: 'Senha',
      name: 'Nome',
      domain: 'Domínio',
      maxUsers: 'Máximo de Usuários',
      maxCertificatesPerMonth: 'Máximo de Certificados por Mês'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if a field has errors and is touched
   */
  hasFieldError(fieldName: string): boolean {
    const form = this.activeTab() === 'login' ? this.loginForm : this.customerForm;
    const field = form.get(fieldName);
    return !!(field?.invalid && field.touched);
  }
}
