import { Injectable, signal } from '@angular/core';

export interface ErrorNotification {
  id: string;
  message: string;
  details?: string;
  statusCode?: number;
  statusText?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorNotificationService {
  private notifications = signal<ErrorNotification[]>([]);
  private notificationIdCounter = 0;
  private readonly DEFAULT_DURATION = 6000; // 6 seconds (1 second more than toasts)

  /**
   * Get the current list of error notifications
   */
  getNotifications() {
    return this.notifications.asReadonly();
  }

  /**
   * Show an error notification
   */
  show(message: string, details?: string, statusCode?: number, statusText?: string, duration: number = this.DEFAULT_DURATION): void {
    const id = `error-notification-${++this.notificationIdCounter}`;
    const notification: ErrorNotification = {
      id,
      message,
      details,
      statusCode,
      statusText,
      timestamp: new Date()
    };

    this.notifications.update(notifications => [...notifications, notification]);

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  /**
   * Show error from HTTP error response
   */
  showHttpError(error: any): void {
    let message = 'An error occurred';
    let details: string | undefined;
    let statusCode: number | undefined;
    let statusText: string | undefined;

    // Extract error information
    if (error?.status) {
      statusCode = error.status;
      statusText = error.statusText;
    }

    // Extract error message from various possible error formats
    if (error?.error) {
      const errorResponse = error.error.error || error.error;
      if (errorResponse?.message) {
        message = errorResponse.message;
      } else if (error.error.message) {
        message = error.error.message;
      } else if (error.error.error) {
        message = error.error.error;
      } else if (typeof error.error === 'string') {
        message = error.error;
      }

      // Build details string
      const detailParts: string[] = [];
      
      if (statusCode) {
        detailParts.push(`Status: ${statusCode} ${statusText || ''}`);
      }
      
      if (error.error?.error) {
        detailParts.push(`Error: ${error.error.error}`);
      }
      
      if (error.error?.message && error.error.message !== message) {
        detailParts.push(`Message: ${error.error.message}`);
      }
      
      if (error.error?.details) {
        detailParts.push(`Details: ${JSON.stringify(error.error.details, null, 2)}`);
      }
      
      if (error.error?.stack) {
        detailParts.push(`Stack: ${error.error.stack}`);
      }
      
      if (error.message && error.message !== message) {
        detailParts.push(`Technical: ${error.message}`);
      }

      // Add full error object as JSON if available
      if (Object.keys(error.error).length > 0) {
        try {
          detailParts.push(`\nFull Error Object:\n${JSON.stringify(error.error, null, 2)}`);
        } catch (e) {
          // Ignore circular reference errors
        }
      }

      details = detailParts.length > 0 ? detailParts.join('\n') : undefined;
    } else if (error?.message) {
      message = error.message;
      if (statusCode) {
        details = `Status: ${statusCode} ${statusText || ''}`;
      }
    }

    // Handle specific error cases
    if (statusCode === 0) {
      message = 'Unable to connect to the server';
      details = details || 'Please check if the backend is running and your network connection.';
    } else if (statusCode === 401) {
      message = message || 'Unauthorized';
      details = details || 'Your session may have expired. Please log in again.';
    } else if (statusCode === 403) {
      message = message || 'Access Forbidden';
      details = details || 'You do not have permission to perform this action.';
    } else if (statusCode === 404) {
      message = message || 'Resource Not Found';
      details = details || 'The requested resource could not be found.';
    } else if (statusCode === 500) {
      message = message || 'Internal Server Error';
      details = details || 'The server encountered an unexpected error.';
    }

    this.show(message, details, statusCode, statusText);
  }

  /**
   * Remove a notification by ID
   */
  remove(id: string): void {
    this.notifications.update(notifications => notifications.filter(notification => notification.id !== id));
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    this.notifications.set([]);
  }
}
