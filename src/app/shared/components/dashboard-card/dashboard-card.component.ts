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

  get iconColor(): string {
    const colorMap: { [key: string]: string } = {
      templates: '#26648E',      // Dark Teal
      versions: '#4F8FC0',       // Medium Blue
      certificates: '#53D2DC',   // Bright Turquoise
      indigo: '#26648E',
      purple: '#4F8FC0',
      green: '#53D2DC',
      blue: '#4F8FC0',
      red: '#FF6B6B'
    };
    return colorMap[this.config.entityType] || colorMap[this.config.color] || '#6B7280';
  }

  get linkColor(): string {
    return this.iconColor;
  }

  get linkHoverColor(): string {
    // Darken the color slightly on hover
    const colorMap: { [key: string]: string } = {
      templates: '#1e4d6b',      // Darker version of #26648E
      versions: '#3d6f96',       // Darker version of #4F8FC0
      certificates: '#3fb8c2',  // Darker version of #53D2DC
      indigo: '#1e4d6b',
      purple: '#3d6f96',
      green: '#3fb8c2',
      blue: '#3d6f96',
      red: '#e55555'
    };
    return colorMap[this.config.entityType] || colorMap[this.config.color] || '#4B5563';
  }

  get linkText(): string {
    return this.config.linkText || `View ${this.config.title.toLowerCase()}`;
  }

  get routerLink(): string {
    return this.config.routerLink || `/${this.config.entityType}`;
  }
}

