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
   * Login user (sets httpOnly cookies)
   */
  login: async (data: LoginData): Promise<void> => {
    await apiClient.post("/users/login", data);
  },

  /**
   * Logout user (clears cookies)
   */
  logout: async (): Promise<void> => {
    await apiClient.post("/users/logout");
  },

  /**
   * Refresh access token using refresh token cookie
   */
  refresh: async (): Promise<void> => {
    await apiClient.post("/users/refresh");
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
   * Get current user information
   */
  getMe: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>("/users/me");
    return extractApiData<User>(response);
  },
};
