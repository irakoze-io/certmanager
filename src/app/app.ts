import { Component, signal, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd, NavigationError, Event } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ErrorNotificationComponent } from './shared/components/error-notification/error-notification.component';
import { ErrorNotificationService } from './core/services/error-notification.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, ErrorNotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('certmanager');
  
  private router = inject(Router);
  private errorNotificationService = inject(ErrorNotificationService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Check if we're on a 404 page immediately when component loads
    setTimeout(() => {
      if (document.body && document.body.textContent?.includes('Cannot GET')) {
        console.error('Detected 404 page in App component');
        
        const currentUrl = window.location.pathname;
        const errorDetails = `The requested page could not be found.\n\nURL: ${currentUrl}\nError: Cannot GET ${currentUrl}\n\nThis can happen if:\n- The route doesn't exist\n- The server isn't configured to handle SPA routes\n- Your session expired\n\nYou will be redirected to the login page.`;
        
        this.errorNotificationService.show(
          'Page Not Found',
          errorDetails,
          404,
          'Not Found',
          8000
        );
        
        // Clear auth and redirect to login
        this.authService.logout();
        this.router.navigate(['/login']);
        return;
      }
    }, 100);

    // Monitor navigation events for errors
    this.router.events
      .pipe(
        filter((event: Event): event is NavigationError => event instanceof NavigationError)
      )
      .subscribe((error: NavigationError) => {
        console.error('Navigation error detected:', error);
        
        // Show error notification
        const errorDetails = `Failed to navigate to the requested page.\n\nURL: ${error.url}\nError: ${error.error?.message || 'Unknown error'}\n\nThis can happen if:\n- The page failed to load (404)\n- Your session expired\n- Network connectivity issues\n\nYou will be redirected to the login page.`;
        
        this.errorNotificationService.show(
          'Navigation Failed',
          errorDetails,
          error.error?.status || 404,
          'Not Found',
          8000
        );
        
        // Clear auth and redirect to login
        this.authService.logout();
        this.router.navigate(['/login']);
      });

    // Handle successful navigation - check if we're on a protected route without auth
    this.router.events
      .pipe(
        filter((event: Event): event is NavigationEnd => event instanceof NavigationEnd)
      )
      .subscribe((event: NavigationEnd) => {
        // If we're on a protected route but not authenticated, the guard will handle it
        // This is just for monitoring
        if (event.url !== '/login' && !this.authService.isAuthenticated()) {
          console.warn('User navigated to protected route without authentication:', event.url);
        }
      });
  }
}
