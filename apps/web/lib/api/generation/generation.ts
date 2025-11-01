import { apiClient, type ApiResponse } from "../axios";

export interface RequeuePageGenerationRequest {
  pageId: string;
}

export interface RegeneratePageRequest {
  pageId: string;
}

/**
 * Requeue page generation
 */
export const requeuePageGeneration = async (
  data: RequeuePageGenerationRequest
): Promise<void> => {
  await apiClient.post<ApiResponse<void>>("/generation/requeue", data);
};

/**
 * Regenerate a page (hard-replace: deletes existing questions)
 */
export const regeneratePage = async (
  data: RegeneratePageRequest
): Promise<void> => {
  await apiClient.post<ApiResponse<void>>("/generation/regenerate-page", data);
};
