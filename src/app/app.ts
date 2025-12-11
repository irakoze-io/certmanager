import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ErrorNotificationComponent } from './shared/components/error-notification/error-notification.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, ErrorNotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('certmanager');
}
