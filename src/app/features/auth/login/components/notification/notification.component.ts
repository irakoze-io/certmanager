import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type NotificationType = 'error' | 'warning' | 'success';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification.component.html',
  styleUrl: './notification.component.css'
})
export class NotificationComponent {
  type = input.required<NotificationType>();
  message = input.required<string>();
}

