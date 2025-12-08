import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import {
  CreateTemplateRequest,
  TemplateResponse,
  CreateTemplateVersionRequest,
  TemplateVersionResponse,
  TemplateVersionStatus
} from '../models/template.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class TemplateService extends ApiService {
  private readonly templatesEndpoint = '/templates';

  constructor(
    protected override http: HttpClient,
    private authService: AuthService
  ) {
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
   * Create a template and immediately create a template version with generic/default data
   */
  createTemplateWithVersion(request: CreateTemplateRequest): Observable<{ template: TemplateResponse; version: TemplateVersionResponse }> {
    const currentUser = this.authService.currentUser();
    
    // Step 1: Create template
    return this.createTemplate(request).pipe(
      switchMap((template) => {
        // Step 2: Create template version with generic data
        const defaultVersionRequest: CreateTemplateVersionRequest = {
          templateId: template.id,
          htmlContent: this.getDefaultHtmlContent(template.name),
          fieldSchema: this.getDefaultFieldSchema(),
          cssStyles: this.getDefaultCssStyles(),
          settings: {
            pageSize: 'A4',
            orientation: 'portrait'
          },
          status: TemplateVersionStatus.DRAFT,
          createdBy: currentUser?.id
        };

        return this.createTemplateVersion(template.id, defaultVersionRequest).pipe(
          switchMap((version) => {
            return new Observable<{ template: TemplateResponse; version: TemplateVersionResponse }>(observer => {
              observer.next({ template, version });
              observer.complete();
            });
          })
        );
      })
    );
  }

  /**
   * Returns default HTML content for a new template version
   */
  private getDefaultHtmlContent(templateName: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Certificate</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 40px; text-align: center;">
  <div style="border: 3px solid #333; padding: 40px; max-width: 800px; margin: 0 auto;">
    <h1 style="color: #2c3e50; margin-bottom: 20px;">Certificate of Completion</h1>
    <p style="font-size: 18px; margin: 20px 0;">This certifies that</p>
    <h2 style="color: #3498db; margin: 20px 0;">{{recipient.name}}</h2>
    <p style="font-size: 16px; margin: 20px 0;">has successfully completed</p>
    <p style="font-size: 18px; font-weight: bold; margin: 20px 0;">${templateName}</p>
    <p style="margin-top: 40px; font-size: 14px; color: #666;">Issued on: {{currentDate}}</p>
    <p style="font-size: 12px; color: #999; margin-top: 20px;">Certificate Number: {{certificateNumber}}</p>
  </div>
</body>
</html>`;
  }

  /**
   * Returns default field schema for a new template version
   */
  private getDefaultFieldSchema(): Record<string, any> {
    return {
      name: {
        type: 'text',
        required: true,
        label: 'Recipient Name',
        description: 'Full name of the certificate recipient'
      }
    };
  }

  /**
   * Returns default CSS styles for a new template version
   */
  private getDefaultCssStyles(): string {
    return `body {
  font-family: 'Arial', 'Helvetica', sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f5f5f5;
}
h1 {
  color: #2c3e50;
  margin-bottom: 20px;
  font-size: 32px;
}
h2 {
  color: #3498db;
  margin: 20px 0;
  font-size: 28px;
}`;
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
   * GET /api/templates/{templateId}/versions/{versionId}
   */
  getTemplateVersionById(templateId: number, versionId: string): Observable<TemplateVersionResponse> {
    return new Observable(observer => {
      this.get<TemplateVersionResponse>(`${this.templatesEndpoint}/${templateId}/versions/${versionId}`).subscribe({
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
   * GET /api/templates/{templateId}/versions
   */
  getTemplateVersions(templateId: number): Observable<TemplateVersionResponse[]> {
    return new Observable(observer => {
      this.get<TemplateVersionResponse[]>(`${this.templatesEndpoint}/${templateId}/versions`).subscribe({
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

  /**
   * Get the latest template version for a template
   */
  getLatestTemplateVersion(templateId: number): Observable<TemplateVersionResponse | null> {
    return new Observable(observer => {
      this.getTemplateVersions(templateId).subscribe({
        next: versions => {
          if (versions && versions.length > 0) {
            // Sort by version number (descending) and get the first one
            const sorted = versions.sort((a, b) => {
              const versionA = typeof a.version === 'number' ? a.version : parseInt(a.version.toString(), 10);
              const versionB = typeof b.version === 'number' ? b.version : parseInt(b.version.toString(), 10);
              return versionB - versionA;
            });
            observer.next(sorted[0]);
          } else {
            observer.next(null);
          }
          observer.complete();
        },
        error: err => {
          console.error('Error getting latest template version:', err);
          observer.next(null);
          observer.complete();
        }
      });
    });
  }

  /**
   * Update an existing template version
   * PUT /api/templates/{templateId}/versions/{versionId}
   */
  updateTemplateVersion(
    templateId: number,
    versionId: string,
    request: Partial<CreateTemplateVersionRequest>
  ): Observable<TemplateVersionResponse> {
    return new Observable(observer => {
      // Include versionId in the request body (required by backend)
      const updatePayload = {
        id: versionId,
        ...request
      };

      this.put<TemplateVersionResponse>(
        `${this.templatesEndpoint}/${templateId}/versions/${versionId}`,
        updatePayload
      ).subscribe({
        next: response => {
          if (response.success && response.data) {
            observer.next(response.data);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to update template version'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }

  /**
   * Publish a template version
   */
  publishTemplateVersion(templateId: number, versionId: string): Observable<any> {
    const url = `${this.templatesEndpoint}/${templateId}/versions/${versionId}/publish`;
    return new Observable(observer => {
      this.post<any>(url, {}).subscribe({
        next: response => {
          if (response.success) {
            observer.next(response.data || response);
            observer.complete();
          } else {
            observer.error(new Error(response.message || 'Failed to publish template version'));
          }
        },
        error: err => observer.error(err)
      });
    });
  }
}
