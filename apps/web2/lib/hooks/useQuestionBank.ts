import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import {
  questionBankApi,
  type QuestionBankFilters,
  type PublishQuestionsRequest,
} from "../api/questionbank/questionbank";
import { toast } from "../toast";

export function useQuestionBank(filters?: QuestionBankFilters) {
  return useQuery({
    queryKey: ["question-bank", filters],
    queryFn: () => questionBankApi.getQuestionBank(filters),
  });
}

export function useQuestionBankItem(id: string) {
  return useQuery({
    queryKey: ["question-bank", id],
    queryFn: () => questionBankApi.getQuestionBankItem(id),
    enabled: !!id,
  });
}

export function usePublishQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: PublishQuestionsRequest) =>
      questionBankApi.publishQuestions(request),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["question-bank"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      toast.success(`${data.published} question(s) published to Question Bank`);
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError && error.response?.data
          ? (error.response.data as { message?: string }).message ||
            error.message
          : error instanceof Error
          ? error.message
          : "Failed to publish questions";
      toast.error(message);
    },
  });
}
