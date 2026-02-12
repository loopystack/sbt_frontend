/**
 * Generic API utility function for making HTTP requests
 * Handles authentication, error handling, and response parsing
 */
import { reportError } from './rollbar';
import { getBaseUrl } from '../config/api';

interface ApiRequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

/**
 * Generic API function for making HTTP requests
 * @param url - The endpoint URL (relative or absolute)
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise with parsed JSON response
 */
export async function api<T = any>(
  url: string, 
  options: ApiRequestOptions = {}
): Promise<T> {
  // Get base URL from centralized config
  const baseUrl = getBaseUrl();
  
  // Ensure URL is absolute
  const absoluteUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  // Get access token for authentication
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  
  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Prepare request options
  const requestOptions: RequestInit = {
    ...options,
    headers,
  };
  
  try {
    // Log request details
    const method = requestOptions.method || 'GET';
    let requestBody = null;
    if (options.body) {
      try {
        if (typeof options.body === 'string') {
          requestBody = JSON.parse(options.body);
        } else {
          requestBody = options.body;
        }
      } catch {
        requestBody = '[Non-JSON body]';
      }
    }
    
    // Always log for statistics endpoint to debug
    if (absoluteUrl.includes('/statistics')) {
      console.log(`🔍 Statistics API Call: ${method} ${absoluteUrl}`);
      console.log('Base URL:', baseUrl);
      console.log('Original URL:', url);
    }
    
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.group(`🌐 API Request: ${method} ${absoluteUrl}`);
      console.log('📤 Request:', {
        method,
        url: absoluteUrl,
        headers: Object.fromEntries(new Headers(requestOptions.headers as HeadersInit).entries()),
        body: requestBody
      });
    }
    
    const response = await fetch(absoluteUrl, requestOptions);
    
    // Only log response details in development mode
    if (import.meta.env.DEV) {
      console.log('📥 Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
    }
    
    // Handle non-JSON responses (like file downloads)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (response.ok) {
        return response as unknown as T;
      } else {
        throw new ApiError(`Request failed with status ${response.status}`, response.status);
      }
    }
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: data
      });
      if (import.meta.env.DEV) {
        console.groupEnd();
      }
      
      // Handle different error response formats
      let errorMessage = 'An error occurred';
      
      if (data.detail) {
        if (Array.isArray(data.detail)) {
          // Validation errors - show first error
          const firstError = data.detail[0];
          errorMessage = firstError.msg || firstError.message || firstError.detail || 'Validation error';
        } else {
          // Single error message
          errorMessage = data.detail;
        }
      } else if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = data.error;
      }
      
      throw new ApiError(errorMessage, response.status, data);
    }
    
    // Only log successful response in development mode
    if (import.meta.env.DEV) {
      console.log('✅ API Success:', {
        status: response.status,
        data: data
      });
      console.groupEnd();
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ API Request failed:', {
      url: absoluteUrl,
      method: requestOptions.method || 'GET',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    if (import.meta.env.DEV) {
      console.groupEnd();
    }
    
    // Report error to Rollbar
    reportError(
      error instanceof Error ? error : new Error(String(error)),
      {
        url: absoluteUrl,
        method: requestOptions.method || 'GET',
        status: error instanceof ApiError ? error.status : undefined,
        details: error instanceof ApiError ? error.details : undefined,
      }
    );
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Network error - please check your connection', 0);
    }
    
    // Handle other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'An unknown error occurred',
      0
    );
  }
}

/**
 * Custom Error class for API errors
 */
class ApiError extends Error {
  status?: number;
  details?: any;
  
  constructor(message: string, status?: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Convenience methods for common HTTP methods
 */
export const apiMethods = {
  get: <T = any>(url: string, options: ApiRequestOptions = {}) =>
    api<T>(url, { ...options, method: 'GET' }),
    
  post: <T = any>(url: string, data?: any, options: ApiRequestOptions = {}) =>
    api<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  put: <T = any>(url: string, data?: any, options: ApiRequestOptions = {}) =>
    api<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  patch: <T = any>(url: string, data?: any, options: ApiRequestOptions = {}) =>
    api<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),
    
  delete: <T = any>(url: string, options: ApiRequestOptions = {}) =>
    api<T>(url, { ...options, method: 'DELETE' }),
};

/**
 * Export the main api function as default and named export
 */
export default api;
