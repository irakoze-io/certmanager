import { Component, input, output, signal, computed, effect, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  menuPosition = signal<'above' | 'below'>('below');
  
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

  // Helper method to safely get nested property values
  getNestedValue(item: T, key: string): any {
    const itemObj = item as Record<string, any>;
    return itemObj[key] ?? null;
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
      this.menuPosition.set('below');
    } else {
      this.openMenuIndex.set(index);
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
      this.menuPosition.set('below');
      return;
    }

    // Find the menu element in the DOM - try multiple times if needed
    let menuElement = document.querySelector(`[data-menu-index="${index}"]`) as HTMLElement;
    
    // If menu not found, retry after a short delay
    if (!menuElement) {
      setTimeout(() => {
        menuElement = document.querySelector(`[data-menu-index="${index}"]`) as HTMLElement;
        if (menuElement) {
          this.performPositionCalculation(buttonElement, menuElement);
        } else {
          // Fallback to below if we can't find the element
          this.menuPosition.set('below');
        }
      }, 50);
      return;
    }

    this.performPositionCalculation(buttonElement, menuElement);
  }

  private performPositionCalculation(buttonElement: HTMLElement, menuElement: HTMLElement): void {
    const buttonRect = buttonElement.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    // Calculate available space relative to viewport
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    // Get actual menu height
    let menuHeight = menuElement.offsetHeight || menuElement.scrollHeight;
    
    // Get computed margins
    const computedStyle = window.getComputedStyle(menuElement);
    const marginTop = parseFloat(computedStyle.marginTop) || 8;
    const marginBottom = parseFloat(computedStyle.marginBottom) || 0;
    
    // Total height needed including margins
    const totalHeightNeeded = menuHeight + marginTop + marginBottom;
    
    // Only position above if menu would be significantly cut off below (less than 50% visible)
    // and there's enough space above to show it fully
    const minVisibleBelow = totalHeightNeeded * 0.5; // At least 50% of menu should be visible
    const wouldBeCutOffBelow = spaceBelow < minVisibleBelow;
    const hasEnoughSpaceAbove = spaceAbove >= totalHeightNeeded;
    
    // Only position above if menu would be cut off AND there's space above
    // Otherwise, always position below to allow normal page scrolling
    if (wouldBeCutOffBelow && hasEnoughSpaceAbove) {
      this.menuPosition.set('above');
    } else {
      this.menuPosition.set('below');
    }
  }

  closeMenu(): void {
    this.openMenuIndex.set(null);
  }

  capitalizeLabel(label: string): string {
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close menu if clicking outside
    if (this.openMenuIndex() !== null) {
      this.openMenuIndex.set(null);
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

  getStatusClass(status: string): string {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'issued' || statusLower === 'on time' || statusLower === 'published') {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
    } else if (statusLower === 'late' || statusLower === 'failed' || statusLower === 'revoked') {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
    } else if (statusLower === 'pending' || statusLower === 'processing' || statusLower === 'draft') {
      return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
    }
    return 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800';
  }
}

