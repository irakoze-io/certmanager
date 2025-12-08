import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  CreateTemplateRequest,
  TemplateResponse,
  CreateTemplateVersionRequest,
  TemplateVersionResponse
} from '../models/template.model';

@Injectable({
  providedIn: 'root'
})
export class TemplateService extends ApiService {
  private readonly templatesEndpoint = '/templates';
  private readonly templateVersionsEndpoint = '/template-versions';

  constructor(protected override http: HttpClient) {
    super(http);
  }

  /**
   * Create a new template
   */
  createTemplate(request: CreateTemplateRequest): Observable<TemplateResponse> {
    console.log('Sending request:', request)
    return new Observable(observer => {
      this.post<TemplateResponse>(this.templatesEndpoint, request).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to create template'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get template by ID
   */
  getTemplateById(id: number): Observable<TemplateResponse> {
    return new Observable(observer => {
      this.get<TemplateResponse>(`${this.templatesEndpoint}/${id}`).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Template not found'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get all templates
   */
  getAllTemplates(): Observable<TemplateResponse[]> {
    return new Observable(observer => {
      this.get<TemplateResponse[]>(this.templatesEndpoint).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(Array.isArray(response.data) ? response.data : [response.data]);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to fetch templates'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Update template
   */
  updateTemplate(id: number, request: Partial<CreateTemplateRequest>): Observable<TemplateResponse> {
    return new Observable(observer => {
      this.put<TemplateResponse>(`${this.templatesEndpoint}/${id}`, request).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to update template'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Delete template
   */
  deleteTemplate(id: number): Observable<void> {
    return new Observable(observer => {
      this.delete<void>(`${this.templatesEndpoint}/${id}`).subscribe({
        next: response => {
          if (response.success) {
            observer.next();
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to delete template'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Create template version
   * POST /api/templates/{templateId}/versions
   */
  createTemplateVersion(templateId: number, request: CreateTemplateVersionRequest): Observable<TemplateVersionResponse> {
    return new Observable(observer => {
      this.post<TemplateVersionResponse>(`${this.templatesEndpoint}/${templateId}/versions`, request).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to create template version'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get latest version number for a template
   */
  getLatestVersionNumber(templateId: number): Observable<number> {
    return new Observable(observer => {
      this.getTemplateById(templateId).subscribe({
        next: template => {
          // Get the highest version number from versions array or use currentVersion
          let latestVersion = template.currentVersion || 0;

          if (template.versions && template.versions.length > 0) {
            const versions = template.versions
              .map(v => {
                if (typeof v.version === 'number') {
                  return v.version;
                }
                const parsed = parseInt(v.version.toString(), 10);
                return isNaN(parsed) ? 0 : parsed;
              })
              .filter(v => v > 0);

            if (versions.length > 0) {
              latestVersion = Math.max(...versions);
            }
          }

          observer.next(latestVersion);
          observer.complete();
        },
        error: err => {
          console.error('Error getting latest version:', err);
          // Return 0 as fallback
          observer.next(0);
          observer.complete();
        }
      });
    });
  }

  /**
   * Get template version by ID
   */
  getTemplateVersionById(id: number): Observable<TemplateVersionResponse> {
    return new Observable(observer => {
      this.get<TemplateVersionResponse>(`${this.templateVersionsEndpoint}/${id}`).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Template version not found'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Get all versions for a template
   */
  getTemplateVersions(templateId: number): Observable<TemplateVersionResponse[]> {
    return new Observable(observer => {
      this.get<TemplateVersionResponse[]>(`${this.templateVersionsEndpoint}?templateId=${templateId}`).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(Array.isArray(response.data) ? response.data : [response.data]);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to fetch template versions'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }
}
