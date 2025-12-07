import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CustomerService } from '../../core/services/customer.service';
import { User } from '../../core/models/auth.model';
import { CustomerResponse } from '../../core/models/customer.model';
import { DashboardCardComponent, DashboardCardConfig } from '../../shared/components/dashboard-card/dashboard-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  currentUser = signal<User | null>(null);
  tenantId = signal<number | null>(null);
  tenantSchema = signal<string | null>(null);
  customer = signal<CustomerResponse | null>(null);

  // Dashboard card configurations
  templatesConfig: DashboardCardConfig = {
    title: 'Templates',
    description: 'Manage certificate templates and versions',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    color: 'templates',
    entityType: 'templates',
    routerLink: '/templates',
    linkText: 'View templates'
  };

  versionsConfig: DashboardCardConfig = {
    title: 'Versions',
    description: 'Manage template versions and revisions',
    icon: 'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2',
    color: 'versions',
    entityType: 'versions',
    routerLink: '/templates', // Versions are managed within templates
    linkText: 'View versions'
  };

  certificatesConfig: DashboardCardConfig = {
    title: 'Certificates',
    description: 'Generate and manage certificates',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'certificates',
    entityType: 'certificates',
    routerLink: '/certificates',
    linkText: 'View certificates'
  };

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
      greeting = 'Good evening';
    }

    return lastName ? `${greeting}, ${lastName}` : greeting;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
