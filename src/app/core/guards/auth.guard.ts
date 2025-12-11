import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ErrorNotificationService } from '../services/error-notification.service';

/**
 * Auth guard to protect routes requiring authentication
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const errorNotificationService = inject(ErrorNotificationService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    return false; // Block SSR access, will be re-evaluated on client
  }

  // Only re-initialize if signals are empty (won't overwrite fresh login data)
  authService.reinitializeFromStorage();

  const isAuth = authService.isAuthenticated();
  if (isAuth) {
    return true;
  }

  // If not authenticated, check localStorage directly as a final fallback
  // This handles edge cases where signals might not be initialized yet
  const token = localStorage.getItem('certmgmt_token');
  const userStr = localStorage.getItem('certmgmt_user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && token) {
        return true;
      }
    } catch (e: any) {
      // Invalid user data - show error notification and redirect
      console.error('Invalid user data in localStorage:', e);
      localStorage.removeItem('certmgmt_token');
      localStorage.removeItem('certmgmt_user');

      const errorDetails = `Invalid authentication data detected. This may occur if:\n- Session data was corrupted\n- Browser storage was cleared\n- Application was updated\n\nError: ${e.message || 'Failed to parse user data'}\n\nPlease log in again to continue.`;
      
      errorNotificationService.show(
        'Authentication Required',
        errorDetails,
        undefined,
        undefined,
        8000 // Show for 8 seconds to give user time to read
      );

      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
      return false;
    }
  }

  // User is not authenticated - show error notification and redirect
  const attemptedUrl = state.url;
  const errorDetails = `You must be logged in to access this page.\n\nAttempted URL: ${attemptedUrl}\n\nThis can happen if:\n- Your session has expired\n- You were logged out\n- The page was reloaded after clearing browser data\n\nPlease log in to continue.`;
  
  errorNotificationService.show(
    'Authentication Required',
    errorDetails,
    undefined,
    undefined,
    8000 // Show for 8 seconds to give user time to read
  );

  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
