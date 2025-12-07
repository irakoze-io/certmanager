import {Routes} from '@angular/router';
import {authGuard} from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'templates',
    loadComponent: () => import('./features/templates/templates-list.component').then(m => m.TemplatesListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'certificates',
    loadComponent: () => import('./features/certificates/certificates-list.component').then(m => m.CertificatesListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'verification',
    loadComponent: () => import('./features/verification/verification-list.component').then(m => m.VerificationListComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
