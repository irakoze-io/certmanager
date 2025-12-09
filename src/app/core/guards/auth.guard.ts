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
      // Invalid user data - proceed to redirect
      console.error('Invalid user data in localStorage:', e);
      localStorage.removeItem('certmgmt_token');
      localStorage.removeItem('certmgmt_user');

      router.navigate(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }
  }

  // Redirect to login with return URL
  router.navigate(['/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
