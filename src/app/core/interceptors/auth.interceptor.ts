import {HttpInterceptorFn, HttpErrorResponse} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, throwError} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {Router} from '@angular/router';
import {ErrorNotificationService} from '../services/error-notification.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const errorNotificationService = inject(ErrorNotificationService);

  const token = authService.getToken();
  const tenantId = authService.getTenantId();
  const tenantSchema = authService.getTenantSchema();

  let clonedReq = req;

  if (tenantId !== null) {
    clonedReq = req.clone({
      setHeaders: {
        'X-Tenant-Id': tenantId.toString()
      }
    });
  } else if (tenantSchema) {
    clonedReq = req.clone({
      setHeaders: {
        'X-Tenant-Schema': tenantSchema
      }
    });
  }

  if (token) {
    clonedReq = clonedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      }
    });
  }

  clonedReq = clonedReq.clone({
    setHeaders: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Unauthorized - token expired or invalid
        const errorDetails = `Your session has expired or your authentication token is invalid.\n\nStatus: 401 Unauthorized\nRequest URL: ${req.url}\n\nThis can happen if:\n- Your session expired due to inactivity\n- Your token was revoked\n- The server restarted and invalidated sessions\n\nYou will be redirected to the login page.`;
        
        errorNotificationService.show(
          'Session Expired',
          errorDetails,
          401,
          'Unauthorized',
          8000 // Show for 8 seconds
        );

        authService.logout();
        router.navigate(['/login']);
      }

      if (error.status === 403) {
        // Forbidden - user doesn't have permission
        const errorDetails = `You do not have permission to access this resource.\n\nStatus: 403 Forbidden\nRequest URL: ${req.url}\n\nThis can happen if:\n- Your account doesn't have the required permissions\n- You're trying to access a resource from a different tenant\n- Your role has been changed\n\nYou will be redirected to the login page.`;
        
        errorNotificationService.show(
          'Access Forbidden',
          errorDetails,
          403,
          'Forbidden',
          8000 // Show for 8 seconds
        );

        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
