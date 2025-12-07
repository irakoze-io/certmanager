import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CustomerService } from '../../core/services/customer.service';
import { User } from '../../core/models/auth.model';
import { CustomerResponse } from '../../core/models/customer.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);
  tenantId = signal<number | null>(null);
  tenantSchema = signal<string | null>(null);
  customer = signal<CustomerResponse | null>(null);

  constructor(
    private authService: AuthService,
    private customerService: CustomerService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    // Get current user info - ensure we're using fresh data
    const user = this.authService.currentUser();
    const tenantId = this.authService.currentTenantId();
    const tenantSchema = this.authService.currentTenantSchema();
    
    // Validate we have all required data
    if (!user || !tenantId) {
      console.error('Missing auth data:', { user, tenantId, tenantSchema });
      this.router.navigate(['/login']);
      return;
    }
    
    this.currentUser.set(user);
    this.tenantId.set(tenantId);
    this.tenantSchema.set(tenantSchema);

    // Fetch customer information using the current user's customerId
    // Log for debugging
    console.log('Dashboard: Fetching customer data', {
      userId: user.id,
      customerId: user.customerId,
      tenantId: tenantId,
      tenantSchema: tenantSchema,
      email: user.email
    });
    
    if (user.customerId) {
      this.customerService.getCustomerById(user.customerId).subscribe({
        next: (customer) => {
          console.log('Dashboard: Customer data loaded', customer);
          this.customer.set(customer);
        },
        error: (error) => {
          console.error('Failed to fetch customer:', error);
          // If customer fetch fails due to tenant mismatch, clear auth and redirect
          if (error.status === 403 && error.error?.errorCode === 'TENANT_MISMATCH') {
            console.error('Tenant mismatch detected - clearing auth state');
            this.authService.logout();
            this.router.navigate(['/login']);
          }
        }
      });
    } else {
      console.error('User has no customerId:', user);
    }
  }

  /**
   * Get user's full name
   */
  getUserFullName(): string {
    const user = this.currentUser();
    if (!user) return '';
    
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else if (lastName) {
      return lastName;
    } else {
      // Fallback to email if no name is available
      return user.email || '';
    }
  }

  /**
   * Get greeting based on time of day
   */
  getGreeting(): string {
    const user = this.currentUser();
    const lastName = user?.lastName || '';
    
    const hour = new Date().getHours();
    let greeting = 'Hello';
    
    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 22) {
      greeting = 'Good evening';
    } else {
      greeting = 'Good night';
    }
    
    return lastName ? `${greeting}, ${lastName}` : greeting;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  navigateToTemplates(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('Navigating to templates');
    console.log('Auth check:', {
      isAuthenticated: this.authService.isAuthenticated(),
      token: this.authService.getToken(),
      user: this.authService.currentUser()
    });
    this.router.navigate(['/templates']).then(
      (success) => {
        console.log('Navigation to templates:', success ? 'success' : 'failed');
        if (!success) {
          console.error('Navigation failed - check console for guard logs');
        }
      },
      (error) => console.error('Navigation error:', error)
    );
  }

  navigateToCertificates(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('Navigating to certificates');
    console.log('Auth check:', {
      isAuthenticated: this.authService.isAuthenticated(),
      token: this.authService.getToken(),
      user: this.authService.currentUser()
    });
    this.router.navigate(['/certificates']).then(
      (success) => {
        console.log('Navigation to certificates:', success ? 'success' : 'failed');
        if (!success) {
          console.error('Navigation failed - check console for guard logs');
        }
      },
      (error) => console.error('Navigation error:', error)
    );
  }

  navigateToVerification(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('Navigating to verification');
    console.log('Auth check:', {
      isAuthenticated: this.authService.isAuthenticated(),
      token: this.authService.getToken(),
      user: this.authService.currentUser()
    });
    this.router.navigate(['/verification']).then(
      (success) => {
        console.log('Navigation to verification:', success ? 'success' : 'failed');
        if (!success) {
          console.error('Navigation failed - check console for guard logs');
        }
      },
      (error) => console.error('Navigation error:', error)
    );
  }
}
