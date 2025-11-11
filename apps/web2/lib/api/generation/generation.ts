import { apiClient, type ApiResponse } from "../axios";

export interface RequeuePageGenerationRequest {
  pageId: string;
}

export interface RegeneratePageRequest {
  pageId: string;
  prompt?: string;
}

export interface RegenerateChapterRequest {
  chapterId: string;
  prompt?: string;
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
 * Regenerate a page (hard-replace: deletes existing questions and sends to LLM)
 */
export const regeneratePage = async (
  data: RegeneratePageRequest
): Promise<void> => {
  await apiClient.post<ApiResponse<void>>("/generation/regenerate-page", data);
};

/**
 * Regenerate a chapter (hard-replace: deletes existing questions for the chapter and sends all pages to LLM)
 */
export const regenerateChapter = async (
  data: RegenerateChapterRequest
): Promise<void> => {
  await apiClient.post<ApiResponse<void>>("/generation/regenerate-chapter", data);
};
