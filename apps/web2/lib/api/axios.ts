import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { toast } from "@/lib/toast";

/**
 * Get API base URL from environment variable or use default
 * Includes /api/v1 prefix for all API routes
 */
const getBaseURL = () => {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4080";
  // Ensure /api/v1 is appended to the base URL
  return `${baseURL.replace(/\/$/, "")}/api/v1`;
};

/**
 * Create axios instance with default configuration
 */
export const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds
  withCredentials: true, // Send cookies (required for httpOnly cookies)
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor
 * Add auth tokens, common headers, etc.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add any additional headers here if needed
    // Auth tokens are handled via httpOnly cookies, so no manual header needed

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor
 * Handle errors globally and integrate with toast notifications
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return successful responses as-is
    return response;
  },
  (error: AxiosError<{ message?: string; error?: { message?: string } }>) => {
    // Handle error responses
    const message =
      error.response?.data?.message || error.response?.data?.error?.message;
    const status = error.response?.status;

    // Don't show toast for cancelled requests or specific status codes
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Handle specific error cases
    switch (status) {
      case 401:
        // Unauthorized - might want to redirect to login
        toast.error("Unauthorized", "Please log in to continue");
        break;
      case 403:
        toast.error(
          "Forbidden",
          "You don't have permission to perform this action"
        );
        break;
      case 404:
        toast.error("Not Found", "The requested resource was not found");
        break;
      case 422:
        // Validation error - show validation message
        toast.error("Validation Error", message || "Please check your input");
        break;
      case 500:
        toast.error(
          "Server Error",
          "Something went wrong on our end. Please try again later"
        );
        break;
      default:
        // Generic error message
        if (message) {
          toast.error("Error", message);
        } else if (error.message === "Network Error") {
          toast.error(
            "Network Error",
            "Unable to connect to the server. Please check your connection"
          );
        } else {
          toast.error(
            "Request Failed",
            error.message || "An unexpected error occurred"
          );
        }
    }

    return Promise.reject(error);
  }
);

/**
 * Typed API response wrapper
 */
export interface ApiResponse<T = unknown, M = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    message?: string;
    code?: string;
  };
  meta?: M;
  status?: number;
}

/**
 * Helper to extract data from API response
 * The API returns { success, data, message } format
 */
export function extractApiData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "API request failed");
  }
  return response.data.data;
}

export default apiClient;
