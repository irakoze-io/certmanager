import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { ErrorNotificationService } from './app/core/services/error-notification.service';
import { inject } from '@angular/core';

/**
 * Bootstrap the Angular application with error handling
 */
bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error('Failed to bootstrap application:', err);
    
    // Try to show error notification if possible
    // Note: This might not work if the app completely fails to initialize
    try {
      // Create a temporary error notification service instance
      // This is a fallback for critical bootstrap failures
      const errorMessage = err?.message || 'Application failed to start';
      const errorDetails = `The application encountered a critical error during startup.\n\nError: ${errorMessage}\n\nThis can happen if:\n- There's a JavaScript error in the application code\n- Required dependencies failed to load\n- Browser compatibility issues\n- Network connectivity problems\n\nPlease refresh the page or contact support if the problem persists.\n\n${err?.stack ? `\nStack Trace:\n${err.stack}` : ''}`;
      
      // Show error in console
      console.error('Bootstrap Error Details:', errorDetails);
      
      // Try to show a basic alert as fallback (since error notification service might not be available)
      if (typeof window !== 'undefined') {
        alert(`Application Error\n\n${errorMessage}\n\nPlease refresh the page.`);
      }
    } catch (notificationError) {
      console.error('Failed to show error notification:', notificationError);
    }
    
    // Re-throw to prevent silent failures
    throw err;
  });
