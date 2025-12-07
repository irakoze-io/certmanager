import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();
  const tenantId = authService.getTenantId();
  const tenantSchema = authService.getTenantSchema();

  // Clone request and add headers
  let clonedReq = req;

  // Add tenant header if available (required for multi-tenant endpoints)
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

  // Add JWT token if available
  if (token) {
    clonedReq = clonedReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Handle response and errors
  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Handle 401 Unauthorized - token expired or invalid
      if (error.status === 401) {
        authService.logout();
        router.navigate(['/login']);
      }

      // Handle 403 Forbidden - insufficient permissions
      if (error.status === 403) {
        console.error('Access forbidden:', error);
      }

      return throwError(() => error);
    })
  );
};
