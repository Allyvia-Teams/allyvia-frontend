/**
 * API Error Response Types
 * Standard error response structure from backend API
 */

/**
 * Standard API Error Response
 * Used by most endpoints
 */
export interface ApiErrorResponse {
  detail?: string;
  error?: string;
  message?: string;
  [key: string]: string | string[] | unknown;
}

/**
 * Validation Error Response
 * Used for 400 Bad Request with field-level validation errors
 */
export interface ValidationErrorResponse {
  detail?: string;
  error?: string;
  [field: string]: string | string[] | unknown;
}

/**
 * Axios Error with API Error Response
 */
export interface ApiError extends Error {
  response?: {
    status?: number;
    data?: ApiErrorResponse | ValidationErrorResponse;
  };
  message: string;
}

/**
 * Helper function to extract error message from API error
 */
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  const apiError = error as ApiError;
  if (apiError.response?.data) {
    const data = apiError.response.data;
    if (data.detail) {
      return String(data.detail);
    }
    if (data.error) {
      return String(data.error);
    }
    if (data.message) {
      return String(data.message);
    }
  }

  if (apiError.message) {
    return apiError.message;
  }

  return 'An unexpected error occurred';
}

/**
 * Helper function to extract validation errors from API error response
 */
export function getValidationErrors(error: unknown): Record<string, string> | null {
  const apiError = error as ApiError;
  if (apiError.response?.status === 400 && apiError.response?.data) {
    const validationData = apiError.response.data as ValidationErrorResponse;
    const errors: Record<string, string> = {};

    Object.keys(validationData).forEach((key) => {
      // Skip non-field keys like 'detail', 'error', 'message'
      if (key === 'detail' || key === 'error' || key === 'message') {
        return;
      }

      const errorValue = validationData[key];
      if (Array.isArray(errorValue) && errorValue.length > 0) {
        errors[key] = String(errorValue[0]);
      } else if (typeof errorValue === 'string' && errorValue.trim()) {
        errors[key] = errorValue;
      }
    });

    return Object.keys(errors).length > 0 ? errors : null;
  }

  return null;
}
