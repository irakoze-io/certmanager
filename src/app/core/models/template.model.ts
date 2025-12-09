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
  version?: number; // Integer - will be auto-incremented if not provided
  htmlContent: string;
  fieldSchema?: Record<string, FieldSchemaField>; // Map of field name to field definition
  cssStyles?: string;
  settings?: Record<string, unknown>; // e.g., { pageSize: 'A4', orientation: 'portrait' }
  status?: TemplateVersionStatus;
  createdBy?: string; // UUID - will be set from current user
}

export interface FieldSchemaField {
  name: string;
  type: FieldType;
  required: boolean;
  label: string;
}

export enum FieldType {
  TEXT = 'text',
  EMAIL = 'email',
  NUMBER = 'number',
  DATE = 'date',
  BINARY = 'binary', // Yes/No
  TEXTAREA = 'textarea'
}

export interface TemplateVersionResponse {
  id?: string; // UUID
  templateId: number;
  version: number | string; // Integer from backend, but can be string in some cases
  htmlContent: string;
  fieldSchema?: Record<string, FieldSchemaField>;
  cssStyles?: string;
  settings?: Record<string, unknown>;
  status: TemplateVersionStatus;
  createdBy?: string; // UUID
  createdByName?: string; // Name of user who created the version
  createdAt?: string;
  updatedAt?: string;
}

export enum TemplateVersionStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED'
}
