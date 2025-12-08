import { Component, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  isOpen = input<boolean>(false);
  title = input<string>('');
  subtitle = input<string>('');
  showCloseButton = input<boolean>(true);
  
  onClose = output<void>();

  constructor() {
    effect(() => {
      if (this.isOpen()) {
        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
  }

  close(): void {
    this.onClose.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}

