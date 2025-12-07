import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth guard to protect routes requiring authentication
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Only check authentication in browser (skip SSR)
  if (!isPlatformBrowser(platformId)) {
    return false; // Block SSR access, will be re-evaluated on client
  }

  // Only re-initialize if signals are empty (won't overwrite fresh login data)
  authService.reinitializeFromStorage();
  
  // Check authentication using the computed signal
  const isAuth = authService.isAuthenticated();
  
  if (isAuth) {
    return true;
  }

  // If not authenticated, check localStorage directly as final fallback
  // This handles edge cases where signals might not be initialized yet
  const token = localStorage.getItem('certmgmt_token');
  const userStr = localStorage.getItem('certmgmt_user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user && token) {
        // Data exists but signals weren't initialized - allow access
        // The service will be initialized on next check
        return true;
      }
    } catch {
      // Invalid user data - proceed to redirect
    }
  }

  // Redirect to login with return URL
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
