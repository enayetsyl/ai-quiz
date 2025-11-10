import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  listUploads,
  uploadPdf,
  initiateDirectUpload,
  uploadFileToR2WithProgress,
  completeDirectUpload,
  getUploadStatus,
  requeueUpload,
  regeneratePage,
  getPageAttempts,
  getUploadAttempts,
  deleteChapter,
  type UploadMetadata,
  type UploadStatusResponse,
  type UploadListItem,
  type GenerationAttempt,
} from "@/lib/api/upload/upload";
import { AxiosError } from "axios";

/**
 * Hook for listing all uploads
 */
export const useUploads = () => {
  return useQuery<UploadListItem[], AxiosError>({
    queryKey: ["uploads"],
    queryFn: listUploads,
    refetchInterval: 5000, // Refetch every 5 seconds to keep status updated
  });
};

/**
 * Hook for uploading a PDF file with progress tracking
 */
export const useUploadPdf = () => {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation<
    { uploadId: string },
    Error,
    { file: File; metadata: UploadMetadata }
  >({
    mutationFn: async ({ file, metadata }) => {
      try {
        // Step 1: Initiate upload (10% progress)
        setUploadProgress(10);
        const { uploadId, presignedUrl, pdfKey } = await initiateDirectUpload(
          metadata,
          file.name
        );

        // Step 2: Upload with progress (30-90% progress)
        setUploadProgress(30);
        await uploadFileToR2WithProgress(file, presignedUrl, (progress) => {
          // Map upload progress from 0-100% to 30-90% of total progress
          setUploadProgress(30 + (progress * 0.6));
        });

        // Step 3: Complete upload (90-100% progress)
        setUploadProgress(90);
        const result = await completeDirectUpload(
          uploadId,
          pdfKey,
          metadata,
          file.name
        );
        setUploadProgress(100);
        return result;
      } catch (error) {
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Upload started", "Your file is being processed");
      // Invalidate upload status queries
      queryClient.invalidateQueries({ queryKey: ["upload", "status"] });
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      // Reset progress after a short delay
      setTimeout(() => setUploadProgress(0), 1000);
    },
    onError: (error) => {
      const errorMessage =
        error instanceof AxiosError && error.response?.data
          ? (error.response.data as { message?: string }).message ||
            error.message
          : error.message;
      toast.error("Upload failed", errorMessage);
      setUploadProgress(0);
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
};

/**
 * Hook for getting upload status
 */
export const useUploadStatus = (uploadId: string | null) => {
  return useQuery<UploadStatusResponse, AxiosError>({
    queryKey: ["upload", "status", uploadId],
    queryFn: () => getUploadStatus(uploadId!),
    enabled: !!uploadId,
    refetchInterval: (query) => {
      // Poll every 2 seconds if there are pages still processing
      const data = query.state.data;
      if (!data) return false;
      const hasProcessingPages = data.pages.some(
        (page) =>
          page.status === "queued" ||
          page.status === "generating" ||
          page.status === "pending"
      );
      return hasProcessingPages ? 2000 : false;
    },
  });
};

/**
 * Hook for requeueing an upload
 */
export const useRequeueUpload = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, string>({
    mutationFn: (uploadId) => requeueUpload(uploadId),
    onSuccess: (_, uploadId) => {
      toast.success("Upload requeued", "Processing will restart shortly");
      queryClient.invalidateQueries({
        queryKey: ["upload", "status", uploadId],
      });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof AxiosError && error.response?.data
          ? (error.response.data as { message?: string }).message ||
            error.message
          : error.message;
      toast.error("Requeue failed", errorMessage);
    },
  });
};

/**
 * Hook for regenerating a page
 */
export const useRegeneratePage = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, string>({
    mutationFn: (pageId) => regeneratePage(pageId),
    onSuccess: () => {
      toast.success(
        "Page regeneration started",
        "Processing will begin shortly"
      );
      queryClient.invalidateQueries({ queryKey: ["upload", "status"] });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof AxiosError && error.response?.data
          ? (error.response.data as { message?: string }).message ||
            error.message
          : error.message;
      toast.error("Regeneration failed", errorMessage);
    },
  });
};

/**
 * Hook for getting page generation attempts
 */
export const usePageAttempts = (pageId: string | null) => {
  return useQuery<
    { pageId: string; attempts: GenerationAttempt[] },
    AxiosError
  >({
    queryKey: ["upload", "page", "attempts", pageId],
    queryFn: () => getPageAttempts(pageId!),
    enabled: !!pageId,
  });
};

/**
 * Hook for getting upload generation attempts
 */
export const useUploadAttempts = (uploadId: string | null) => {
  return useQuery<
    { uploadId: string; attempts: GenerationAttempt[] },
    AxiosError
  >({
    queryKey: ["upload", "attempts", uploadId],
    queryFn: () => getUploadAttempts(uploadId!),
    enabled: !!uploadId,
  });
};

/**
 * Hook for deleting a chapter and all associated data
 */
export const useDeleteChapter = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, string>({
    mutationFn: (chapterId) => deleteChapter(chapterId),
    onSuccess: () => {
      toast.success(
        "Chapter deleted",
        "Chapter and all associated data have been deleted successfully"
      );
      // Invalidate uploads list to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["uploads"] });
      // Also invalidate taxonomy queries in case chapters are shown elsewhere
      queryClient.invalidateQueries({ queryKey: ["taxonomy", "chapters"] });
    },
    onError: (error) => {
      const errorMessage =
        error instanceof AxiosError && error.response?.data
          ? (error.response.data as { message?: string }).message ||
            error.message
          : error.message;
      toast.error("Delete failed", errorMessage);
    },
  });
};
