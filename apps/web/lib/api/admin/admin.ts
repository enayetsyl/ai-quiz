import { apiClient, extractApiData, type ApiResponse } from "../axios";

export interface AdminFilters {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  pageId?: string;
  model?: string;
  isSuccess?: boolean;
}

export interface PageGenerationAttempt {
  id: string;
  pageId: string;
  attemptNo: number;
  model: string;
  promptVersion: string;
  isSuccess: boolean;
  errorMessage?: string | null;
  requestExcerpt?: string | null;
  responseExcerpt?: string | null;
  createdAt: string;
  page?: {
    id: string;
    pageNumber: number;
    upload?: {
      id: string;
      originalFilename: string;
      class?: { id: number; displayName: string };
      subject?: { id: string; name: string };
      chapter?: { id: string; name: string };
    };
  };
  llmUsageEvents?: LlmUsageEvent[];
}

export interface LlmUsageEvent {
  id: string;
  pageId?: string | null;
  attemptId?: string | null;
  model: string;
  tokensIn?: number | null;
  tokensOut?: number | null;
  estimatedCostUsd?: number | null;
  createdAt: string;
  page?: {
    id: string;
    pageNumber: number;
    upload?: {
      id: string;
      originalFilename: string;
      class?: { id: number; displayName: string };
      subject?: { id: string; name: string };
      chapter?: { id: string; name: string };
    };
  };
  attempt?: PageGenerationAttempt;
}

export interface PageInfo {
  id: string;
  uploadId: string;
  pageNumber: number;
  language?: string | null;
  status: string;
  s3PngKey: string;
  s3ThumbKey: string;
  lastGeneratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  upload?: {
    id: string;
    originalFilename: string;
    class?: { id: number; displayName: string };
    subject?: { id: string; name: string };
    chapter?: { id: string; name: string };
    uploadedByUser?: { id: string; email: string };
  };
  questions?: Array<{ id: string; status: string }>;
  pageGenerationAttempts?: Array<{
    id: string;
    isSuccess: boolean;
    attemptNo: number;
  }>;
  _count?: {
    questions: number;
    pageGenerationAttempts: number;
  };
}

export interface ApiToken {
  id: string;
  name: string;
  tokenHash: string;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: string;
  createdByUser?: {
    id: string;
    email: string;
  };
}

export interface DashboardStats {
  totalPages: number;
  totalQuestions: number;
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  totalLlmEvents: number;
  totalApiTokens: number;
  totalTokensUsed: {
    in: number;
    out: number;
    total: number;
  };
  totalCost: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface LlmUsageStats {
  totalEvents: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalCost: number;
}

export const adminApi = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>(
      "/admin/dashboard/stats"
    );
    return extractApiData<DashboardStats>(response);
  },

  getPageGenerationAttempts: async (
    filters: AdminFilters = {}
  ): Promise<PaginatedResponse<PageGenerationAttempt>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.pageSize)
      params.append("pageSize", filters.pageSize.toString());
    if (filters.pageId) params.append("pageId", filters.pageId);
    if (filters.model) params.append("model", filters.model);
    if (filters.isSuccess !== undefined)
      params.append("isSuccess", filters.isSuccess.toString());
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const response = await apiClient.get<
      ApiResponse<PaginatedResponse<PageGenerationAttempt>>
    >(`/admin/page-generation-attempts?${params.toString()}`);
    return extractApiData<PaginatedResponse<PageGenerationAttempt>>(response);
  },

  getLlmUsageEvents: async (
    filters: AdminFilters = {}
  ): Promise<PaginatedResponse<LlmUsageEvent> & { stats: LlmUsageStats }> => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.pageSize)
      params.append("pageSize", filters.pageSize.toString());
    if (filters.pageId) params.append("pageId", filters.pageId);
    if (filters.model) params.append("model", filters.model);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const response = await apiClient.get<
      ApiResponse<PaginatedResponse<LlmUsageEvent> & { stats: LlmUsageStats }>
    >(`/admin/llm-usage-events?${params.toString()}`);
    return extractApiData<
      PaginatedResponse<LlmUsageEvent> & { stats: LlmUsageStats }
    >(response);
  },

  getPages: async (
    filters: AdminFilters = {}
  ): Promise<PaginatedResponse<PageInfo>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.pageSize)
      params.append("pageSize", filters.pageSize.toString());
    if (filters.pageId) params.append("pageId", filters.pageId);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const response = await apiClient.get<
      ApiResponse<PaginatedResponse<PageInfo>>
    >(`/admin/pages?${params.toString()}`);
    return extractApiData<PaginatedResponse<PageInfo>>(response);
  },

  getApiTokens: async (
    filters: AdminFilters = {}
  ): Promise<PaginatedResponse<ApiToken>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append("page", filters.page.toString());
    if (filters.pageSize)
      params.append("pageSize", filters.pageSize.toString());
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);

    const response = await apiClient.get<
      ApiResponse<PaginatedResponse<ApiToken>>
    >(`/admin/api-tokens?${params.toString()}`);
    return extractApiData<PaginatedResponse<ApiToken>>(response);
  },
};
