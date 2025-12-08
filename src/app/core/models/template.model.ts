/**
 * Template models matching backend DTOs
 */

export interface CreateTemplateRequest {
  customerId: number;
  name: string;
  code: string;
  description?: string;
  currentVersion?: number;
  metadata?: Record<string, unknown>;
}

export interface TemplateResponse {
  id: number;
  customerId: number;
  name: string;
  code: string;
  description?: string;
  currentVersion?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  versions?: TemplateVersionResponse[];
}

export interface CreateTemplateVersionRequest {
  templateId: number;
  htmlContent: string;
  cssContent?: string;
  jsonSchema?: Record<string, unknown>;
  version?: string;
  status?: TemplateVersionStatus;
}

export interface TemplateVersionResponse {
  id: number;
  templateId: number;
  version: string;
  htmlContent: string;
  cssContent?: string;
  jsonSchema?: Record<string, unknown>;
  status: TemplateVersionStatus;
  createdAt?: string;
  updatedAt?: string;
}

export enum TemplateVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}
