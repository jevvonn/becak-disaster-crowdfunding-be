export interface ValidationErrorItem {
  field: string;
  message: string;
}

export type ApiErrors = string | ValidationErrorItem[] | null;

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  errors: ApiErrors;
  data: T | null;
}

export type ErrorResponse = ApiResponse<null>;

export function successResponse<T>(message: string, data: T): ApiResponse<T> {
  return { success: true, message, errors: null, data };
}

export function errorResponse(message: string, errors: ApiErrors = null): ErrorResponse {
  return { success: false, message, errors, data: null };
}
