import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import {
  requeuePageGeneration,
  regeneratePage,
  type RequeuePageGenerationRequest,
  type RegeneratePageRequest,
} from "@/lib/api/generation/generation";
import { AxiosError } from "axios";

/**
 * Hook for requeueing page generation
 */
export const useRequeuePageGeneration = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, RequeuePageGenerationRequest>({
    mutationFn: requeuePageGeneration,
    onSuccess: () => {
      toast.success("Page generation requeued", "Processing will restart shortly");
      queryClient.invalidateQueries({ queryKey: ["upload", "status"] });
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
export const useRegeneratePageGeneration = () => {
  const queryClient = useQueryClient();

  return useMutation<void, AxiosError, RegeneratePageRequest>({
    mutationFn: regeneratePage,
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
