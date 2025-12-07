import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

export type EntityType = 'templates' | 'versions' | 'certificates';

export interface DashboardCardConfig {
  title: string;
  description: string;
  icon: string; // SVG path
  color: string; // Tailwind color class (e.g., 'indigo', 'green', 'blue')
  entityType: EntityType;
  routerLink?: string; // Route path for navigation
  linkText?: string; // Text for the link (defaults to "View {title}")
}

@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-card.component.html',
  styleUrl: './dashboard-card.component.css'
})
export class DashboardCardComponent {
  @Input({ required: true }) config!: DashboardCardConfig;
  @Input() count?: number;

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

  get linkColorClass(): string {
    const colorMap: { [key: string]: string } = {
      indigo: 'text-indigo-600 hover:text-indigo-700',
      purple: 'text-purple-600 hover:text-purple-700',
      green: 'text-green-600 hover:text-green-700',
      blue: 'text-blue-600 hover:text-blue-700',
      red: 'text-red-600 hover:text-red-700'
    };
    return colorMap[this.config.color] || 'text-gray-600 hover:text-gray-700';
  }

  get linkText(): string {
    return this.config.linkText || `View ${this.config.title.toLowerCase()}`;
  }

  get routerLink(): string {
    return this.config.routerLink || `/${this.config.entityType}`;
  }
}

