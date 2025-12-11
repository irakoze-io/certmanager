import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ErrorNotificationService } from '../services/error-notification.service';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private errorNotificationService = inject(ErrorNotificationService);

  handleError(error: any): void {
    console.error('Global error handler:', error);

    let message = 'An unexpected error occurred';
    let details: string | undefined;

    if (error?.message) {
      message = error.message;
    }

    const detailParts: string[] = [];

    if (error?.name) {
      detailParts.push(`Error Type: ${error.name}`);
    }

    if (error?.stack) {
      detailParts.push(`Stack Trace:\n${error.stack}`);
    }

    if (error?.error) {
      detailParts.push(`Error Object: ${JSON.stringify(error.error, null, 2)}`);
    }

    if (error?.message && error.message !== message) {
      detailParts.push(`Message: ${error.message}`);
    }

    try {
      detailParts.push(`\nFull Error:\n${JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}`);
    } catch (e) {
      detailParts.push(`\nFull Error: [Unable to stringify - circular reference]`);
    }

    details = detailParts.length > 0 ? detailParts.join('\n\n') : undefined;

    this.errorNotificationService.show(message, details);
  }
}
