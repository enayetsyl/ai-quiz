import { apiClient, extractApiData, type ApiResponse } from "./axios";

export interface RegisterData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role?: string;
}

export const authApi = {
  /**
   * Register a new user
   */
  register: async (data: RegisterData): Promise<User> => {
    const response = await apiClient.post<ApiResponse<User>>(
      "/users/register",
      data
    );
    return extractApiData<User>(response);
  },

  /**
   * Login user (sets httpOnly cookies via Next.js API route)
   */
  login: async (data: LoginData): Promise<void> => {
    // Use Next.js API route which proxies to Express and sets cookies
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensure cookies are sent with the request
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Login failed");
    }
  },

  /**
   * Logout user (clears cookies via Next.js API route)
   */
  logout: async (): Promise<void> => {
    // Use Next.js API route which proxies to Express and clears cookies
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensure cookies are sent with the request
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Logout failed");
    }
  },

  /**
   * Refresh access token using refresh token cookie (via Next.js API route)
   */
  refresh: async (): Promise<void> => {
    // Use Next.js API route which proxies to Express and sets cookies
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensure cookies are sent with the request
    });
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.message || "Token refresh failed");
    }
  },

  /**
   * Request password reset
   */
  forgotPassword: async (data: ForgotPasswordData): Promise<void> => {
    await apiClient.post("/users/forgot-password", data);
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: ResetPasswordData): Promise<void> => {
    await apiClient.post("/users/reset-password", data);
  },

  /**
   * Get current user information (via Next.js API route)
   */
  getMe: async (): Promise<User> => {
    // Use Next.js API route which proxies to Express and forwards cookies
    const response = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Ensure cookies are sent with the request
    });
    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.message || "Failed to get user information");
    }
    return result.data;
  },
};
