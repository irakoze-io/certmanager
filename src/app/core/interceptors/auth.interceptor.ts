import {HttpInterceptorFn, HttpErrorResponse} from '@angular/common/http';
import {inject} from '@angular/core';
import {catchError, throwError} from 'rxjs';
import {AuthService} from '../services/auth.service';
import {Router} from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

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
        authService.logout();
        router.navigate(['/login']);
      }

      if (error.status === 403) {
        console.error('Access forbidden:', error);
      }

      return throwError(() => error);
    })
  );
};
