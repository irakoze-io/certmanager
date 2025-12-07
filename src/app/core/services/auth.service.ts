import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { LoginRequest, LoginResponse, User, AuthState } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly authUrl = `${environment.apiUrl}${environment.authBasePath}`;
  private readonly tokenKey = 'certmgmt_token';
  private readonly userKey = 'certmgmt_user';
  private readonly tenantIdKey = 'certmgmt_tenant_id';
  private readonly tenantSchemaKey = 'certmgmt_tenant_schema';
  private readonly isBrowser: boolean;

  // Signals for reactive state management
  private readonly tokenSignal = signal<string | null>(null);
  private readonly userSignal = signal<User | null>(null);
  private readonly tenantIdSignal = signal<number | null>(null);
  private readonly tenantSchemaSignal = signal<string | null>(null);

  // Computed signals
  readonly isAuthenticated = computed(() => !!this.tokenSignal() && !!this.userSignal());
  readonly currentUser = computed(() => this.userSignal());
  readonly currentTenantId = computed(() => this.tenantIdSignal());
  readonly currentTenantSchema = computed(() => this.tenantSchemaSignal());
  readonly authState = computed<AuthState>(() => ({
    user: this.userSignal(),
    token: this.tokenSignal(),
    tenantId: this.tenantIdSignal(),
    tenantSchema: this.tenantSchemaSignal(),
    isAuthenticated: this.isAuthenticated()
  }));

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Initialize from storage on service creation (only in browser)
    if (this.isBrowser) {
      this.initializeFromStorage();
    }
  }

  /**
   * Login with email and password
   */
  login(tenantId: number, request: LoginRequest): Observable<ApiResponse<LoginResponse>> {
    return this.http.post<ApiResponse<LoginResponse>>(
      `${this.authUrl}/login`,
      request,
      {
        headers: {
          'X-Tenant-Id': tenantId.toString()
        }
      }
    ).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.setAuthState(response.data, tenantId);
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current user info
   */
  getCurrentUser(): Observable<unknown> {
    return this.http.get(`${this.authUrl}/me`);
  }

  /**
   * Logout - clear all auth state
   */
  logout(): void {
    this.clearAuthState();
  }

  /**
   * Get stored JWT token
   */
  getToken(): string | null {
    return this.tokenSignal();
  }

  /**
   * Get stored tenant ID
   */
  getTenantId(): number | null {
    return this.tenantIdSignal();
  }

  /**
   * Get stored tenant schema
   */
  getTenantSchema(): string | null {
    return this.tenantSchemaSignal();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.userSignal();
    return user?.role === role;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(...roles: string[]): boolean {
    const user = this.userSignal();
    return user ? roles.includes(user.role) : false;
  }

  /**
   * Set authentication state from login response
   */
  private setAuthState(loginResponse: LoginResponse, tenantId: number): void {
    const user: User = {
      id: loginResponse.userId,
      customerId: loginResponse.customerId,
      email: loginResponse.email,
      firstName: loginResponse.firstName,
      lastName: loginResponse.lastName,
      role: loginResponse.role as any,
      active: true
    };

    // Update signals
    this.tokenSignal.set(loginResponse.token);
    this.userSignal.set(user);
    this.tenantIdSignal.set(tenantId);
    this.tenantSchemaSignal.set(loginResponse.tenantSchema);

    // Persist to localStorage (only in browser)
    if (this.isBrowser) {
      localStorage.setItem(this.tokenKey, loginResponse.token);
      localStorage.setItem(this.userKey, JSON.stringify(user));
      localStorage.setItem(this.tenantIdKey, tenantId.toString());
      localStorage.setItem(this.tenantSchemaKey, loginResponse.tenantSchema);
    }
  }

  /**
   * Clear authentication state
   */
  private clearAuthState(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    this.tenantIdSignal.set(null);
    this.tenantSchemaSignal.set(null);

    // Clear localStorage (only in browser)
    if (this.isBrowser) {
      localStorage.removeItem(this.tokenKey);
      localStorage.removeItem(this.userKey);
      localStorage.removeItem(this.tenantIdKey);
      localStorage.removeItem(this.tenantSchemaKey);
    }
  }

  /**
   * Initialize state from localStorage
   */
  private initializeFromStorage(): void {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    const tenantId = this.getStoredTenantId();
    const tenantSchema = this.getStoredTenantSchema();

    if (token && user) {
      this.tokenSignal.set(token);
      this.userSignal.set(user);
      this.tenantIdSignal.set(tenantId);
      this.tenantSchemaSignal.set(tenantSchema);
    }
  }

  /**
   * Get stored token from localStorage
   */
  private getStoredToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * Get stored user from localStorage
   */
  private getStoredUser(): User | null {
    if (!this.isBrowser) return null;
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr) as User;
    } catch {
      return null;
    }
  }

  /**
   * Get stored tenant ID from localStorage
   */
  private getStoredTenantId(): number | null {
    if (!this.isBrowser) return null;
    const tenantIdStr = localStorage.getItem(this.tenantIdKey);
    return tenantIdStr ? parseInt(tenantIdStr, 10) : null;
  }

  /**
   * Get stored tenant schema from localStorage
   */
  private getStoredTenantSchema(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem(this.tenantSchemaKey);
  }
}
