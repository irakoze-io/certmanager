import {Component, signal} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {CommonModule} from '@angular/common';
import {AuthService} from '../../../core/services/auth.service';
import {CustomerService} from '../../../core/services/customer.service';
import {LoginRequest, UserRole} from '../../../core/models/auth.model';
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
  userForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  returnUrl = signal<string | null>(null);
  showPassword = signal(false);
  showUserForm = signal(false);
  createdCustomerId = signal<number | null>(null);
  showUserPassword = signal(false);

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
      tenantId: ['', [Validators.required, Validators.min(1)]],
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

    // Initialize user form
    this.userForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      firstName: ['', [Validators.required, Validators.minLength(1)]],
      lastName: ['', [Validators.required, Validators.minLength(1)]],
      role: ['VIEWER', [Validators.required]]
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
   * Toggle user password visibility
   */
  toggleUserPasswordVisibility(): void {
    this.showUserPassword.set(!this.showUserPassword());
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

    const tenantId = parseInt(formValue.tenantId, 10);

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

        // Extract error message from various possible error formats
        let errorMsg = 'Login failed. Please check your credentials and try again.';

        if (error.error) {
          // Check if it's an ApiResponse format
          if (error.error.message) {
            errorMsg = error.error.message;
          } else if (error.error.error) {
            errorMsg = error.error.error;
          } else if (typeof error.error === 'string') {
            errorMsg = error.error;
          }
        } else if (error.message) {
          errorMsg = error.message;
        }

        // Handle specific error cases
        if (error.status === 0) {
          errorMsg = 'Unable to connect to the server. Please check if the backend is running.';
        } else if (error.status === 401) {
          errorMsg = 'Invalid credentials. Please check your email and password.';
        } else if (error.status === 400) {
          errorMsg = errorMsg || 'Invalid request. Please check your tenant ID and credentials.';
        } else if (error.status === 404) {
          errorMsg = 'Login endpoint not found. Please check the API configuration.';
        }

        this.errorMessage.set(errorMsg);
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
        this.createdCustomerId.set(response.id);
        this.successMessage.set('Customer created successfully! Now create your first user account.');
        this.isLoading.set(false);
        // Show user creation form
        this.showUserForm.set(true);
        // Reset customer form
        this.customerForm.reset({
          maxUsers: 10,
          maxCertificatesPerMonth: 100
        });
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
    let form: FormGroup;
    if (this.showUserForm()) {
      form = this.userForm;
    } else {
      form = this.activeTab() === 'login' ? this.loginForm : this.customerForm;
    }
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
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

  /**
   * Get human-readable field label
   */
  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      tenantId: 'Tenant ID',
      email: 'Email',
      password: 'Password',
      firstName: 'First Name',
      lastName: 'Last Name',
      role: 'Role',
      name: 'Name',
      domain: 'Domain',
      maxUsers: 'Max Users',
      maxCertificatesPerMonth: 'Max Certificates per Month'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Handle user creation form submission
   */
  onUserSubmit(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched(this.userForm);
      return;
    }

    const customerId = this.createdCustomerId();
    if (!customerId) {
      this.errorMessage.set('Customer ID is missing. Please create a customer first.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const formValue = this.userForm.value;
    const userRequest: LoginRequest = {
      email: formValue.email,
      password: formValue.password,
      firstName: formValue.firstName,
      lastName: formValue.lastName,
      role: formValue.role as UserRole
    };

    this.authService.createUser(customerId, userRequest).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.successMessage.set('User created successfully! You can now log in.');
          this.isLoading.set(false);
          // Reset user form
          this.userForm.reset({
            role: 'VIEWER'
          });
          // Hide user form and switch to login tab after 2 seconds
          setTimeout(() => {
            this.showUserForm.set(false);
            this.setActiveTab('login');
            // Pre-fill email in login form
            this.loginForm.patchValue({
              tenantId: customerId,
              email: formValue.email
            });
          }, 2000);
        } else {
          this.errorMessage.set(response.message || 'User creation failed');
          this.isLoading.set(false);
        }
      },
      error: (error) => {
        console.error('User creation error:', error);
        this.errorMessage.set(
          error.error?.message ||
          error.message ||
          'Failed to create user. Please try again.'
        );
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Skip user creation and go to login
   */
  skipUserCreation(): void {
    const customerId = this.createdCustomerId();
    this.showUserForm.set(false);
    this.setActiveTab('login');
    if (customerId) {
      this.loginForm.patchValue({
        tenantId: customerId
      });
    }
  }

  /**
   * Check if a field has errors and is touched
   */
  hasFieldError(fieldName: string): boolean {
    let form: FormGroup;
    if (this.showUserForm()) {
      form = this.userForm;
    } else {
      form = this.activeTab() === 'login' ? this.loginForm : this.customerForm;
    }
    const field = form.get(fieldName);
    return !!(field?.invalid && field.touched);
  }
}
