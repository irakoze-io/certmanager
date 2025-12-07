/**
 * Authentication models matching backend DTOs
 */

export interface LoginRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  keycloakId?: string;
  active?: boolean;
}

export interface LoginResponse {
  token: string;
  tokenType: string;
  userId: string;
  email: string;
  customerId: number;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantSchema: string;
  authenticated: boolean;
}

export interface User {
  id: string;
  customerId: number;
  email: string;
  keycloakId?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  active: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  VIEWER = 'VIEWER',
  API_CLIENT = 'API_CLIENT'
}

export interface AuthState {
  user: User | null;
  token: string | null;
  tenantId: number | null;
  tenantSchema: string | null;
  isAuthenticated: boolean;
}
