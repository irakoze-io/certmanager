import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EntityType = 'templates' | 'versions' | 'certificates';

export interface DashboardCardConfig {
  title: string;
  description: string;
  icon: string; // SVG path
  color: string; // Tailwind color class (e.g., 'indigo', 'green', 'blue')
  entityType: EntityType;
}

@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-card.component.html',
  styleUrl: './dashboard-card.component.css'
})
export class DashboardCardComponent {
  @Input({ required: true }) config!: DashboardCardConfig;
  @Input() count?: number;
  
  @Output() add = new EventEmitter<void>();
  @Output() revoke = new EventEmitter<void>();
  @Output() list = new EventEmitter<void>();

  get iconColorClass(): string {
    const colorMap: { [key: string]: string } = {
      indigo: 'text-indigo-600',
      purple: 'text-purple-600',
      green: 'text-green-600',
      blue: 'text-blue-600',
      red: 'text-red-600'
    };
    return colorMap[this.config.color] || 'text-gray-600';
  }

  get addButtonClass(): string {
    const colorMap: { [key: string]: string } = {
      indigo: 'text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700',
      purple: 'text-purple-600 hover:bg-purple-50 hover:text-purple-700',
      green: 'text-green-600 hover:bg-green-50 hover:text-green-700',
      blue: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700',
      red: 'text-red-600 hover:bg-red-50 hover:text-red-700'
    };
    return colorMap[this.config.color] || 'text-gray-600 hover:bg-gray-50 hover:text-gray-700';
  }

  onAdd(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.add.emit();
  }

  onRevoke(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.revoke.emit();
  }

  onList(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.list.emit();
  }
}

