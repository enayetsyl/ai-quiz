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
  chapterId?: string;
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
 * Initiate a direct upload to R2
 */
export const initiateDirectUpload = async (
  metadata: UploadMetadata,
  filename: string
): Promise<{
  uploadId: string;
  presignedUrl: string;
  pdfKey: string;
  metadata: UploadMetadata;
}> => {
  const response = await apiClient.post<
    ApiResponse<{
      uploadId: string;
      presignedUrl: string;
      pdfKey: string;
      metadata: UploadMetadata;
    }>
  >("/uploads/initiate", {
    ...metadata,
    originalname: filename,
  });
  return extractApiData(response);
};

/**
 * Upload file directly to R2 using presigned URL
 */
export const uploadFileToR2 = async (
  file: File,
  presignedUrl: string
): Promise<void> => {
  const response = await fetch(presignedUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file: ${response.statusText}`);
  }
};

/**
 * Upload file to R2 with progress tracking
 */
export const uploadFileToR2WithProgress = async (
  file: File,
  presignedUrl: string,
  onProgress: (progress: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText} (${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed: Network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload cancelled"));
    });

    xhr.open("PUT", presignedUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });
};

/**
 * Complete the upload after direct R2 upload
 */
export const completeDirectUpload = async (
  uploadId: string,
  pdfKey: string,
  metadata: UploadMetadata,
  originalname: string
): Promise<UploadResponse> => {
  const response = await apiClient.post<ApiResponse<UploadResponse>>(
    "/uploads/complete",
    {
      uploadId,
      pdfKey,
      metadata,
      originalname,
    }
  );
  return extractApiData(response);
};

/**
 * Upload a PDF file with metadata using direct R2 upload
 * This bypasses the Next.js proxy and uploads directly to R2
 */
export const uploadPdf = async (
  file: File,
  metadata: UploadMetadata
): Promise<UploadResponse> => {
  // Step 1: Get presigned URL
  const { uploadId, presignedUrl, pdfKey } = await initiateDirectUpload(
    metadata,
    file.name
  );

  // Step 2: Upload directly to R2
  await uploadFileToR2(file, presignedUrl);

  // Step 3: Complete the upload
  return await completeDirectUpload(uploadId, pdfKey, metadata, file.name);
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
