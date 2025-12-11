import { inject, PLATFORM_ID, Injector } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

            details = detailParts.length > 0 ? detailParts.join('\n\n') : undefined;

            errorNotificationService.show(message, details);
          } catch (e) {
            // If error notification service isn't available, just log
            console.error('Failed to show error notification:', e);
          }
        }
      });

    } catch (error: any) {
      console.error('App initializer failed:', error);
      // If initialization fails critically, we can't show error notifications
      // The bootstrap error handler in main.ts will handle this
      throw error;
    }
  };
}
