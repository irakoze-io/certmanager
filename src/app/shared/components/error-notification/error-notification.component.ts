import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorNotificationService } from '../../../core/services/error-notification.service';

@Component({
  selector: 'app-error-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-notification.component.html',
  styleUrl: './error-notification.component.css'
})
export class ErrorNotificationComponent {
  private errorNotificationService = inject(ErrorNotificationService);
  
  notifications = this.errorNotificationService.getNotifications();
  
  // Track expanded state for each notification
  expandedStates = signal<Set<string>>(new Set());

  removeNotification(id: string): void {
    this.errorNotificationService.remove(id);
    // Clean up expanded state
    const expanded = this.expandedStates();
    expanded.delete(id);
    this.expandedStates.set(new Set(expanded));
  }

  toggleExpand(id: string): void {
    const expanded = this.expandedStates();
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    this.expandedStates.set(new Set(expanded));
  }

  isExpanded(id: string): boolean {
    return this.expandedStates().has(id);
  }

  formatDetails(details?: string): string {
    if (!details) return '';
    // Format details with proper line breaks
    return details;
  }
}
