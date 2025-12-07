/**
 * Template models matching backend DTOs
 */

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category?: string;
}

export interface TemplateResponse {
  id: number;
  name: string;
  description?: string;
  category?: string;
  customerId: number;
  createdAt?: string;
  updatedAt?: string;
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
