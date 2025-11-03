import { apiClient, extractApiData, type ApiResponse } from "../axios";

export interface UploadMetadata {
  classId: number;
  subjectId: string;
  chapterId: string;
}

export interface UploadResponse {
  uploadId: string;
}

export type PageStatusType =
  | "pending"
  | "queued"
  | "generating"
  | "complete"
  | "failed";

export interface PageStatus {
  id: string;
  pageNumber: number;
  status: PageStatusType;
  s3PngKey: string | null;
  s3ThumbKey: string | null;
  pngUrl: string | null;
  thumbUrl: string | null;
  lastGeneratedAt: string | null;
}

export interface UploadStatusResponse {
  uploadId: string;
  pages: PageStatus[];
  pagesCount: number;
}

export interface UploadListItem {
  id: string;
  originalFilename: string;
  createdAt: string;
  pagesCount: number;
  completedPages: number;
  failedPages: number;
  processingPages: number;
  status: "pending" | "processing" | "completed" | "failed" | "partial";
  classLevel: string | null;
  subject: string | null;
  chapter: string | null;
}

export interface GenerationAttempt {
  id: string;
  pageId: string;
  attemptNo?: number;
  model?: string;
  promptVersion?: string;
  isSuccess?: boolean;
  status?: string;
  errorMessage: string | null;
  requestExcerpt?: string | null;
  responseExcerpt?: string | null;
  createdAt: string;
}

/**
 * List all uploads
 */
export const listUploads = async (): Promise<UploadListItem[]> => {
  const response = await apiClient.get<ApiResponse<UploadListItem[]>>(
    "/uploads"
  );
  return extractApiData(response);
};

/**
 * Upload a PDF file with metadata
 */
export const uploadPdf = async (
  file: File,
  metadata: UploadMetadata
): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("classId", metadata.classId.toString());
  formData.append("subjectId", metadata.subjectId);
  formData.append("chapterId", metadata.chapterId);

  const response = await apiClient.post<ApiResponse<UploadResponse>>(
    "/uploads",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return extractApiData(response);
};

/**
 * Get upload status with pages
 */
export const getUploadStatus = async (
  uploadId: string
): Promise<UploadStatusResponse> => {
  const response = await apiClient.get<ApiResponse<UploadStatusResponse>>(
    `/uploads/${uploadId}/status`
  );
  return extractApiData(response);
};

/**
 * Requeue an upload for processing
 */
export const requeueUpload = async (uploadId: string): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(`/uploads/${uploadId}/requeue`);
};

/**
 * Regenerate a specific page
 */
export const regeneratePage = async (pageId: string): Promise<void> => {
  await apiClient.post<ApiResponse<void>>(
    `/uploads/pages/${pageId}/regenerate`
  );
};

/**
 * Get generation attempts for a specific page
 */
export const getPageAttempts = async (
  pageId: string
): Promise<{ pageId: string; attempts: GenerationAttempt[] }> => {
  const response = await apiClient.get<
    ApiResponse<{ pageId: string; attempts: GenerationAttempt[] }>
  >(`/uploads/pages/${pageId}/attempts`);
  return extractApiData(response);
};

/**
 * Get generation attempts for an upload
 */
export const getUploadAttempts = async (
  uploadId: string
): Promise<{ uploadId: string; attempts: GenerationAttempt[] }> => {
  const response = await apiClient.get<
    ApiResponse<{ uploadId: string; attempts: GenerationAttempt[] }>
  >(`/uploads/${uploadId}/attempts`);
  return extractApiData(response);
};
