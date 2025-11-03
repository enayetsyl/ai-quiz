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

      if (action === "publish") {
        toast.success(`${count} question(s) published to Question Bank`);
        queryClient.invalidateQueries({ queryKey: ["question-bank"] });
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
