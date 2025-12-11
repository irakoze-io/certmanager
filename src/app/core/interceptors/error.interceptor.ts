import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ErrorNotificationService } from '../services/error-notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorNotificationService = inject(ErrorNotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't show notifications for 401 errors (handled by auth interceptor)
      // Don't show notifications for 403 errors (handled by auth interceptor)
      // You can add more conditions here if needed
      if (error.status !== 401 && error.status !== 403) {
        errorNotificationService.showHttpError(error);
      }

      // Re-throw the error so other error handlers can still process it
      return throwError(() => error);
    })
  );
};
