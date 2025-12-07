/**
 * Unified API Response structure matching backend Response<T>
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: ErrorResponse;
  details?: unknown;
}

export interface ErrorResponse {
  errorCode?: string;
  errorType?: string;
  errorDetails?: string[];
  errorData?: unknown;
}
