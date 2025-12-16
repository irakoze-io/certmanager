import { ApplicationConfig, ErrorHandler, APP_INITIALIZER, provideBrowserGlobalErrorListeners, inject } from '@angular/core';
import { provideRouter, withComponentInputBinding, withNavigationErrorHandler } from '@angular/router';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { GlobalErrorHandler } from './core/handlers/global-error.handler';
import { appInitializer } from './core/initializers/app.initializer';
import { ErrorNotificationService } from './core/services/error-notification.service';
import { AuthService } from './core/services/auth.service';
import { Router } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideBrowserGlobalErrorListeners(),
    {
      provide: ErrorHandler,
      useClass: GlobalErrorHandler
    },
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializer,
      multi: true
    },
    provideRouter(
      routes,
      withComponentInputBinding(),
      withNavigationErrorHandler((error) => {
        console.error('Navigation error:', error);

        // Get services using inject (available in this context)
        try {
          const errorNotificationService = inject(ErrorNotificationService);
          const router = inject(Router);
          const authService = inject(AuthService);

          // Determine error type and show appropriate notification
          // NavigationError has: id, url, error (the actual error object)
          const errorMessage = error.error?.message || error.error?.toString() || 'Unknown error';
          const errorStatus = error.error?.status || 404;

          let message = 'Navigation Failed';
          let details = `Failed to navigate to the requested page.\n\nURL: ${error.url}\nError: ${errorMessage}\n\nThis can happen if:\n- The page failed to load (404)\n- Your session expired\n- The route doesn't exist\n- Network connectivity issues\n\nYou will be redirected to the login page.`;

          // Check if it's a 404 or route not found
          if (errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('Cannot GET')) {
            message = 'Page Not Found';
            details = `The requested page could not be found.\n\nURL: ${error.url}\nError: ${errorMessage}\n\nThis can happen if:\n- The route doesn't exist\n- The page failed to load\n- Your session expired\n\nYou will be redirected to the login page.`;
          }

          // Show error notification
          errorNotificationService.show(message, details, errorStatus, 'Not Found', 8000);

          // Clear auth and redirect to login
          authService.logout();
          router.navigate(['/login']);
        } catch (e) {
          console.error('Failed to handle navigation error:', e);
        }

        return false; // Prevent navigation
      })
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, errorInterceptor])
    )
  ]
};
