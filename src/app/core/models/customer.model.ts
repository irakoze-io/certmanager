/**
 * Customer models matching backend DTOs
 */

export interface CreateCustomerRequest {
  name: string;
  domain: string;
  status?: CustomerStatus;
  maxUsers?: number;
  maxCertificatesPerMonth?: number;
}

export interface CustomerResponse {
  id: number;
  name: string;
  domain: string;
  tenantSchema: string;
  status: CustomerStatus;
  maxUsers: number;
  maxCertificatesPerMonth: number;
  createdAt?: string;
  updatedAt?: string;
}

export enum CustomerStatus {
  TRIAL = 'TRIAL',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED'
}
