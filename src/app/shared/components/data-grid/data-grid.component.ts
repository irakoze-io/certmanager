import { Component, input, output, signal, computed, effect, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { formatDate, formatTime } from '../../../core/utils/date.util';
import { ToastService } from '../../../core/services/toast.service';

export interface DataGridColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface GridAction {
  label: string;
  action: string;
  icon: string; // SVG path
  danger?: boolean; // For destructive actions
}

export interface DataGridConfig {
  title: string;
  addButtonLabel: string;
  columns: DataGridColumn[];
  actions?: GridAction[]; // Context-specific actions
  showCheckbox?: boolean;
  showDateSelector?: boolean;
  showSearch?: boolean;
  showFilter?: boolean;
  itemsPerPageOptions?: number[];
  defaultItemsPerPage?: number;
}

@Component({
  selector: 'app-data-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './data-grid.component.html',
  styleUrl: './data-grid.component.css'
})
export class DataGridComponent<T = any> {
  config = input.required<DataGridConfig>();
  data = input.required<T[]>();
  isLoading = input<boolean>(false);

  onAdd = output<void>();
  onSearch = output<string>();
  onFilter = output<void>();
  onPageChange = output<number>();
  onItemsPerPageChange = output<number>();
  onRowClick = output<T>();
  onActionClick = output<{ action: string; item: T }>();

  private sanitizer = inject(DomSanitizer);
  private toastService = inject(ToastService);

  // Date management
  currentDate = signal<Date>(new Date());
  currentYear = computed(() => this.currentDate().getFullYear());

  // Search
  searchQuery = signal<string>('');

  // Pagination
  currentPage = signal<number>(1);
  itemsPerPage = signal<number>(10);

  // Action menu state
  openMenuIndex = signal<number | null>(null);
  menuStyles = signal<{ [key: string]: string }>({});

  // Computed values
  totalPages = computed(() => {
    const total = Math.ceil(this.data().length / this.itemsPerPage());
    return total === 0 ? 1 : total; // At least 1 page even if empty
  });
  paginatedData = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage();
    const end = start + this.itemsPerPage();
    return this.data().slice(start, end);
  });

  constructor() {
    // Set default items per page from config using effect
    effect(() => {
      const config = this.config();
      if (config?.defaultItemsPerPage && this.itemsPerPage() === 10) {
        this.itemsPerPage.set(config.defaultItemsPerPage);
      }
    });

    // Reset to page 1 when data changes (but only if we're not on page 1)
    effect(() => {
      const dataLength = this.data().length;
      if (dataLength > 0 && this.currentPage() > Math.ceil(dataLength / this.itemsPerPage())) {
        this.currentPage.set(1);
      }
    });
  }

  getSafeIcon(icon: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(icon);
  }

  // Helper method to safely get nested property values
  formatDate = formatDate;
  formatTime = formatTime;

  getNestedValue(item: T, key: string): any {
    const itemObj = item as Record<string, any>;
    return itemObj[key] ?? null;
  }

  shouldShowPreviewAction(action: string, item: T): boolean {
    if (action !== 'previewVersion') {
      return true; // Show all other actions
    }

    // For preview action, only show if version is published
    const status = this.getNestedValue(item, 'status');
    if (status === 'PUBLISHED') {
      return true;
    }

    // Check if it's a template row with published versions
    const original = this.getNestedValue(item, '_original');
    if (original?._isTemplateRow && original?.versions) {
      const versions = original.versions as any[];
      return versions.some((v: any) => v.status === 'PUBLISHED');
    }

    // Check if it's a version row with published status
    if (this.getNestedValue(item, '_isVersionRow')) {
      const versionStatus = original?.status;
      return versionStatus === 'PUBLISHED';
    }

    return false;
  }

  copyToClipboard(text: string, event: Event): void {
    event.stopPropagation(); // Prevent row click
    
    if (!text || text === '-') {
      return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
      this.toastService.success('Certificate number copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
      this.toastService.error('Failed to copy certificate number');
    });
  }

  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1); // Reset to first page on search
    this.onSearch.emit(value);
  }

  onFilterClick(): void {
    this.onFilter.emit();
  }

  onAddClick(): void {
    this.onAdd.emit();
  }

  onPreviousDate(): void {
    const newDate = new Date(this.currentDate());
    newDate.setDate(newDate.getDate() - 1);
    this.currentDate.set(newDate);
  }

  onNextDate(): void {
    const newDate = new Date(this.currentDate());
    newDate.setDate(newDate.getDate() + 1);
    this.currentDate.set(newDate);
  }

  onPreviousPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.set(this.currentPage() - 1);
      this.onPageChange.emit(this.currentPage());
    }
  }

  onNextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.set(this.currentPage() + 1);
      this.onPageChange.emit(this.currentPage());
    }
  }

  onPageSelect(page: number): void {
    this.currentPage.set(page);
    this.onPageChange.emit(page);
  }

  onItemsPerPageSelect(value: number): void {
    this.itemsPerPage.set(value);
    this.currentPage.set(1); // Reset to first page
    this.onItemsPerPageChange.emit(value);
  }

  onRowClickHandler(item: T): void {
    this.onRowClick.emit(item);
  }

  onActionClickHandler(action: string, item: T, event: Event): void {
    event.stopPropagation();
    this.onActionClick.emit({ action, item });
    this.openMenuIndex.set(null); // Close menu after action
  }

  toggleMenu(index: number, event: Event): void {
    event.stopPropagation();
    if (this.openMenuIndex() === index) {
      this.openMenuIndex.set(null);
      this.menuStyles.set({});
    } else {
      this.openMenuIndex.set(index);
      // Initialize with opacity 0 to measure without flashing in wrong place
      this.menuStyles.set({ 'opacity': '0', 'position': 'fixed' });

      // Calculate menu position after DOM update - use multiple frames to ensure rendering
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            this.calculateMenuPosition(event.target as HTMLElement, index);
          }, 10);
        });
      });
    }
  }

  private calculateMenuPosition(buttonElement: HTMLElement | null, index: number): void {
    if (!buttonElement) {
      this.menuStyles.set({});
      return;
    }

    // Find the menu element in the DOM
    let menuElement = document.querySelector(`[data-menu-index="${index}"]`) as HTMLElement;

    // If menu not found, retry after a short delay
    if (!menuElement) {
      setTimeout(() => {
        menuElement = document.querySelector(`[data-menu-index="${index}"]`) as HTMLElement;
        if (menuElement) {
          this.performPositionCalculation(buttonElement, menuElement);
        } else {
          this.openMenuIndex.set(null); // Just close if cannot find
        }
      }, 50);
      return;
    }

    this.performPositionCalculation(buttonElement, menuElement);
  }

  private performPositionCalculation(buttonElement: HTMLElement, menuElement: HTMLElement): void {
    const buttonRect = buttonElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const menuHeight = menuElement.offsetHeight || menuElement.scrollHeight;

    // Dimensions
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const totalHeightNeeded = menuHeight + 10; // Extra margin

    // Choose position
    let top: number;
    let originClass = '';

    if (spaceBelow >= totalHeightNeeded) {
      // Position below
      top = buttonRect.bottom + 5;
      originClass = 'origin-top-right';
    } else {
      // Position above
      top = buttonRect.top - menuHeight - 5;
      originClass = 'origin-bottom-right';
    }

    // Position fixed to viewport, aligning right edge of menu with right edge of button (approx)
    const right = viewportWidth - buttonRect.right;

    this.menuStyles.set({
      'position': 'fixed',
      'top': `${top}px`,
      'right': `${right}px`,
      'z-index': '9999', // Ensure it's on top of everything
      'opacity': '1',    // Make visible
      'transform-origin': originClass === 'origin-top-right' ? 'top right' : 'bottom right'
    });
  }

  closeMenu(): void {
    this.openMenuIndex.set(null);
    this.menuStyles.set({}); // Clear styles when closing
  }

  capitalizeLabel(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  }

  getColumnHeaderClass(columnKey: string): string {
    const baseClass = 'py-3 text-left text-sm font-bold text-gray-700 tracking-wider';

    if (columnKey === 'recipientName') {
      return `${baseClass} px-6 min-w-[200px] max-w-[250px]`;
    } else if (columnKey === 'templateName') {
      // Wider to accommodate certificate number without truncation
      return `${baseClass} px-6 min-w-[220px] max-w-[280px]`;
    } else if (columnKey === 'name') {
      return `${baseClass} px-6 w-72 lg:w-96`;
    } else if (columnKey === 'description') {
      return `${baseClass} px-6 w-auto min-w-[150px] max-w-[200px]`;
    } else if (columnKey === 'code' || columnKey === 'certificateNumber') {
      return `${baseClass} px-6 min-w-[180px] max-w-[220px] whitespace-nowrap`;
    } else if (columnKey === 'issuerUserId') {
      return `${baseClass} px-6 min-w-[150px] max-w-[200px]`;
    } else if (columnKey === 'currentVersion' || columnKey === 'version') {
      return `${baseClass} px-6 w-28 whitespace-nowrap`;
    } else if (columnKey === 'status' || columnKey === 'versionStatus') {
      return `${baseClass} px-6 w-32 whitespace-nowrap`;
    } else if (['createdAt', 'issuedAt'].includes(columnKey)) {
      return `${baseClass} px-6 w-36 whitespace-nowrap`;
    } else {
      return `${baseClass} px-6 whitespace-nowrap`;
    }
  }

  getColumnCellClass(columnKey: string): string {
    const baseClass = 'py-3 text-sm text-gray-900';

    if (columnKey === 'recipientName') {
      return `${baseClass} px-6 min-w-[200px] max-w-[250px]`;
    } else if (columnKey === 'templateName') {
      // Wider to accommodate certificate number without truncation
      return `${baseClass} px-6 min-w-[220px] max-w-[280px]`;
    } else if (columnKey === 'name') {
      return `${baseClass} px-6 w-72 lg:w-96`;
    } else if (columnKey === 'description') {
      return `${baseClass} px-6 w-auto min-w-[150px] max-w-[200px]`;
    } else if (columnKey === 'code' || columnKey === 'certificateNumber') {
      return `${baseClass} px-6 min-w-[180px] max-w-[220px] whitespace-nowrap`;
    } else if (columnKey === 'issuerUserId') {
      return `${baseClass} px-6 min-w-[150px] max-w-[200px]`;
    } else if (columnKey === 'currentVersion' || columnKey === 'version') {
      return `${baseClass} px-6 w-28 whitespace-nowrap`;
    } else if (columnKey === 'status' || columnKey === 'versionStatus') {
      return `${baseClass} px-6 w-32 whitespace-nowrap`;
    } else if (['createdAt', 'issuedAt'].includes(columnKey)) {
      return `${baseClass} px-6 w-36 whitespace-nowrap`;
    } else {
      return `${baseClass} px-6 whitespace-nowrap`;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close menu if clicking outside. 
    // Note: The menu itself has (click)="$event.stopPropagation()" so this only catches outside clicks.
    if (this.openMenuIndex() !== null) {
      this.closeMenu();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.openMenuIndex() !== null) {
      this.closeMenu();
    }
  }

  getFormattedDate(): string {
    const date = this.currentDate();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const day = date.getDate().toString().padStart(2, '0');
    return `${days[date.getDay()]} ${day} ${months[date.getMonth()]}`;
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      // Show pages around current
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      // Show last page
      pages.push(total);
    }

    return pages;
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.split(' ').filter(part => part.length > 0);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getStatusClass(status: string): string {
    const statusLower = (status || '').toLowerCase();

    // Green (On time, Issued, Published)
    if (['issued', 'on time', 'published', 'active', 'completed'].includes(statusLower)) {
      return 'bg-green-50 text-green-700 border-green-100';
    }
    // Red (Late, Failed, Revoked)
    else if (['late', 'failed', 'revoked', 'expired', 'inactive'].includes(statusLower)) {
      return 'bg-red-50 text-red-700 border-red-100';
    }
    // Yellow/Orange (Pending, Processing, Draft)
    else if (['pending', 'processing', 'draft', 'in progress'].includes(statusLower)) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-100';
    }

    // Default Gray
    return 'bg-gray-50 text-gray-700 border-gray-200';
  }

  getStatusDotClass(status: string): string {
    const statusLower = (status || '').toLowerCase();

    if (['issued', 'on time', 'published', 'active', 'completed'].includes(statusLower)) {
      return 'bg-green-500';
    }
    else if (['late', 'failed', 'revoked', 'expired', 'inactive'].includes(statusLower)) {
      return 'bg-red-500';
    }
    else if (['pending', 'processing', 'draft', 'in progress'].includes(statusLower)) {
      return 'bg-yellow-500';
    }

    return 'bg-gray-400';
  }
}

