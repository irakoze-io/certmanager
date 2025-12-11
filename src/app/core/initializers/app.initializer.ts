import { inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ErrorNotificationService } from '../services/error-notification.service';

/**
 * App initializer to handle initialization errors
 * This runs before the app starts and can catch early initialization failures
 */
export function appInitializer(): () => Promise<void> {
  return async () => {
    const platformId = inject(PLATFORM_ID);
    
    if (!isPlatformBrowser(platformId)) {
      return; // Skip on server-side
    }

    try {
      const injector = inject(Injector);
      
      // Re-initialize auth from storage (using injector to avoid circular dependencies)
      const authService = injector.get(AuthService);
      authService.reinitializeFromStorage();

      // Set up global error handlers for unhandled promise rejections
      // Note: Error notification service will be injected lazily when errors occur
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        
        try {
          const errorNotificationService = injector.get(ErrorNotificationService);
          const error = event.reason;
          let message = 'An unexpected error occurred';
          let details: string | undefined;

          if (error?.message) {
            message = error.message;
          }

          const detailParts: string[] = [];
          detailParts.push('Unhandled Promise Rejection');
          
          if (error?.stack) {
            detailParts.push(`Stack Trace:\n${error.stack}`);
          }
          
          if (error?.error) {
            detailParts.push(`Error Object: ${JSON.stringify(error.error, null, 2)}`);
          }

          details = detailParts.length > 0 ? detailParts.join('\n\n') : undefined;

          errorNotificationService.show(message, details);
        } catch (e) {
          // If error notification service isn't available, just log
          console.error('Failed to show error notification:', e);
        }
      });

      // Set up global error handler for errors
      window.addEventListener('error', (event) => {
        // Only handle errors that aren't already handled by Angular's error handler
        if (event.error && !event.error.handled) {
          console.error('Global error event:', event.error);
          
          try {
            const errorNotificationService = injector.get(ErrorNotificationService);
            const router = injector.get(Router);
            const authService = injector.get(AuthService);
            const error = event.error;
            let message = 'A page error occurred';
            let details: string | undefined;

            if (error?.message) {
              message = error.message;
            }

            const detailParts: string[] = [];
            detailParts.push(`Error in ${event.filename || 'unknown file'} at line ${event.lineno || 'unknown'}`);
            
            if (error?.stack) {
              detailParts.push(`Stack Trace:\n${error.stack}`);
            }

            // Check if it's a 404 or resource load failure
            if (event.target && (event.target as any).tagName) {
              const target = event.target as any;
              if (target.tagName === 'SCRIPT' || target.tagName === 'LINK') {
                message = 'Resource Load Failed';
                detailParts.unshift(`Failed to load resource: ${target.src || target.href || 'unknown'}`);
                
                // If it's a critical resource failure, redirect to login
                authService.logout();
                router.navigate(['/login']);
              }
            }

            details = detailParts.length > 0 ? detailParts.join('\n\n') : undefined;

            errorNotificationService.show(message, details);
          } catch (e) {
            // If error notification service isn't available, just log
            console.error('Failed to show error notification:', e);
          }
        }
      });

      // Handle failed resource loads (404s for scripts, styles, etc.)
      window.addEventListener('error', (event) => {
        // Handle resource loading errors (scripts, stylesheets, images, etc.)
        if (event.target && (event.target as any).tagName && !event.error) {
          const target = event.target as any;
          const resourceUrl = target.src || target.href;
          
          // Only handle 404s for application resources, not external resources
          if (resourceUrl && (resourceUrl.includes('localhost') || resourceUrl.includes(window.location.hostname))) {
            console.error('Resource load failed:', resourceUrl);
            
            try {
              const errorNotificationService = injector.get(ErrorNotificationService);
              const router = injector.get(Router);
              const authService = injector.get(AuthService);
              
              const errorDetails = `Failed to load application resource.\n\nResource: ${resourceUrl}\n\nThis can happen if:\n- The resource was moved or deleted\n- Network connectivity issues\n- Server configuration problems\n- Your session expired\n\nYou will be redirected to the login page.`;
              
              errorNotificationService.show(
                'Resource Load Failed',
                errorDetails,
                404,
                'Not Found',
                8000
              );
              
              // Clear auth and redirect to login
              authService.logout();
              router.navigate(['/login']);
            } catch (e) {
              console.error('Failed to handle resource load error:', e);
            }
          }
        }
      }, true); // Use capture phase to catch errors before they bubble

      // Check if we're on a 404 page (when page loads with 404)
      // This handles the case where the server returns 404 before Angular loads
      if (document.body && document.body.textContent?.includes('Cannot GET')) {
        console.error('Detected 404 page - Cannot GET error');
        
        try {
          const errorNotificationService = injector.get(ErrorNotificationService);
          const router = injector.get(Router);
          const authService = injector.get(AuthService);
          
          const currentUrl = window.location.pathname;
          const errorDetails = `The requested page could not be found.\n\nURL: ${currentUrl}\nError: Cannot GET ${currentUrl}\n\nThis can happen if:\n- The route doesn't exist\n- The server isn't configured to handle SPA routes\n- Your session expired\n- The page failed to load\n\nYou will be redirected to the login page.`;
          
          errorNotificationService.show(
            'Page Not Found',
            errorDetails,
            404,
            'Not Found',
            8000
          );
          
          // Clear auth and redirect to login
          authService.logout();
          router.navigate(['/login']);
        } catch (e) {
          console.error('Failed to handle 404 page error:', e);
        }
      }

      // Monitor fetch/XHR errors for 404s
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        try {
          const response = await originalFetch.apply(this, args);
          
          // Check if it's a 404 for a route (not an API call)
          if (response.status === 404 && args[0] && typeof args[0] === 'string') {
            const url = args[0] as string;
            // Only handle route 404s, not API 404s
            if (!url.includes('/api/') && !url.includes('/auth/') && !url.match(/\.[^/]+$/)) {
              console.error('Route 404 detected:', url);
              
              try {
                const errorNotificationService = injector.get(ErrorNotificationService);
                const router = injector.get(Router);
                const authService = injector.get(AuthService);
                
                const errorDetails = `The requested page could not be found.\n\nURL: ${url}\nStatus: 404 Not Found\n\nThis can happen if:\n- The route doesn't exist\n- The server isn't configured to handle SPA routes\n- Your session expired\n\nYou will be redirected to the login page.`;
                
                errorNotificationService.show(
                  'Page Not Found',
                  errorDetails,
                  404,
                  'Not Found',
                  8000
                );
                
                // Clear auth and redirect to login
                authService.logout();
                router.navigate(['/login']);
              } catch (e) {
                console.error('Failed to handle fetch 404 error:', e);
              }
            }
          }
          
          return response;
        } catch (error) {
          throw error;
        }
      };

    } catch (error: any) {
      console.error('App initializer failed:', error);
      // If initialization fails critically, we can't show error notifications
      // The bootstrap error handler in main.ts will handle this
      throw error;
    }
  };
}
