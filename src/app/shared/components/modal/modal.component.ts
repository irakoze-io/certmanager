import { Component, input, output, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent implements OnDestroy {
  isOpen = input<boolean>(false);
  title = input<string>('');
  subtitle = input<string>('');
  showCloseButton = input<boolean>(true);
  showEditButton = input<boolean>(false);
  showDeleteButton = input<boolean>(false);
  
  onClose = output<void>();
  onEdit = output<void>();
  onDelete = output<void>();

  private originalBodyOverflow: string | null = null;
  private hasLockedScroll = false;

  constructor() {
    // Set up effect to manage body scroll lock
    effect(() => {
      const isCurrentlyOpen = this.isOpen();
      
      if (isCurrentlyOpen) {
        // Only lock if we haven't locked it yet (prevents double-locking)
        if (!this.hasLockedScroll) {
          // Store original value before locking
          this.originalBodyOverflow = document.body.style.overflow || '';
          document.body.style.overflow = 'hidden';
          this.hasLockedScroll = true;
        }
      } else {
        // Only unlock if we were the one who locked it
        if (this.hasLockedScroll) {
          document.body.style.overflow = this.originalBodyOverflow || '';
          this.hasLockedScroll = false;
          this.originalBodyOverflow = null;
        }
      }
    });
  }

  ngOnDestroy(): void {
    // Always restore body overflow on destroy if we locked it
    // This ensures scroll is never permanently locked, even if component is destroyed while modal is open
    if (this.hasLockedScroll) {
      document.body.style.overflow = this.originalBodyOverflow || '';
      this.hasLockedScroll = false;
      this.originalBodyOverflow = null;
    }
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

