import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  questionApi,
  type QuestionFilters,
  type UpdateQuestionData,
  type BulkActionRequest,
} from "../api/question/question";
import { toast } from "../toast";

export function useQuestions(filters?: QuestionFilters) {
  return useQuery({
    queryKey: ["questions", filters],
    queryFn: () => questionApi.getQuestions(filters),
  });
}

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ["questions", id],
    queryFn: () => questionApi.getQuestion(id),
    enabled: !!id,
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuestionData }) =>
      questionApi.updateQuestion(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["questions", data.id] });
      toast.success("Question updated successfully");
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError && error.response?.data
          ? (error.response.data as { message?: string }).message ||
            error.message
          : error instanceof Error
          ? error.message
          : "Failed to update question";
      toast.error(message);
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => questionApi.deleteQuestion(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success("Question deleted successfully");
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError && error.response?.data
          ? (error.response.data as { message?: string }).message ||
            error.message
          : error instanceof Error
          ? error.message
          : "Failed to delete question";
      toast.error(message);
    },
  });
}

export function useBulkActionQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: BulkActionRequest) => questionApi.bulkAction(request),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      const action = variables.action;
      const count = data.updated || data.deleted || data.published || 0;

      // Invalidate question bank if questions were published (approve or publish action)
      if (action === "approve" && data.published !== undefined && data.published > 0) {
        queryClient.invalidateQueries({ queryKey: ["question-bank"] });
      } else if (action === "publish") {
        queryClient.invalidateQueries({ queryKey: ["question-bank"] });
      }

      // Construct success messages based on action and result
      if (action === "approve") {
        if (data.published !== undefined && data.published > 0) {
          toast.success(`${data.published} question(s) approved and published to Question Bank`);
        } else {
          toast.success(`${data.updated || 0} question(s) approved`);
        }
      } else if (action === "reject") {
        toast.success(`${data.deleted || 0} question(s) rejected and deleted`);
      } else if (action === "publish") {
        toast.success(`${data.published || 0} question(s) published to Question Bank`);
      } else {
        toast.success(`Bulk ${action} completed for ${count} question(s)`);
      }
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError && error.response?.data
          ? (error.response.data as { message?: string }).message ||
            error.message
          : error instanceof Error
          ? error.message
          : "Bulk action failed";
      toast.error(message);
    },
  });
}
