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

    // Get current user info
    const user = this.authService.currentUser();
    this.currentUser.set(user);
    this.tenantId.set(this.authService.currentTenantId());
    this.tenantSchema.set(this.authService.currentTenantSchema());

    // Fetch customer information
    if (user?.customerId) {
      this.customerService.getCustomerById(user.customerId).subscribe({
        next: (customer) => {
          this.customer.set(customer);
        },
        error: (error) => {
          console.error('Failed to fetch customer:', error);
        }
      });
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
}
