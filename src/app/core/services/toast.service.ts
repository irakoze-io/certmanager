import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // Duration in milliseconds, undefined means it won't auto-dismiss
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;

  /**
   * Get the current list of toasts
   */
  getToasts() {
    return this.toasts.asReadonly();
  }

  /**
   * Show a toast notification
   */
  show(type: ToastType, message: string, duration: number = 5000): void {
    const id = `toast-${++this.toastIdCounter}`;
    const toast: Toast = {
      id,
      type,
      message,
      duration
    };

    this.toasts.update(toasts => [...toasts, toast]);

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  /**
   * Show success toast
   */
  success(message: string, duration: number = 5000): void {
    this.show('success', message, duration);
  }

  /**
   * Show error toast
   */
  error(message: string, duration: number = 5000): void {
    this.show('error', message, duration);
  }

  /**
   * Show warning toast
   */
  warning(message: string, duration: number = 5000): void {
    this.show('warning', message, duration);
  }

  /**
   * Show info toast
   */
  info(message: string, duration: number = 5000): void {
    this.show('info', message, duration);
  }

  /**
   * Remove a toast by ID
   */
  remove(id: string): void {
    this.toasts.update(toasts => toasts.filter(toast => toast.id !== id));
  }

  /**
   * Clear all toasts
   */
  clear(): void {
    this.toasts.set([]);
  }
}
