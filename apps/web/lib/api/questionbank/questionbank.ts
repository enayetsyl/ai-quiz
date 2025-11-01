import { apiClient, extractApiData, type ApiResponse } from "../axios";

export type Difficulty = "easy" | "medium" | "hard";
export type Language = "bn" | "en";
export type OptionKey = "a" | "b" | "c" | "d";

export interface QuestionBankItem {
  id: string;
  sourceQuestionId?: string | null;
  classId: number;
  subjectId: string;
  chapterId: string;
  pageId?: string | null;
  language: Language;
  difficulty: Difficulty;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionKey;
  explanation: string;
  addedBy?: string | null;
  createdAt: string;
  seqNo?: number | null;
  subjShortCode?: string | null;
  pageImageUrl?: string | null;
  pageThumbUrl?: string | null;
  class?: {
    id: number;
    displayName: string;
  };
  subject?: {
    id: string;
    name: string;
    code?: string | null;
  };
  chapter?: {
    id: string;
    name: string;
    ordinal: number;
  };
  sourceQuestion?: {
    id: string;
    stem: string;
  };
}

export interface QuestionBankFilters {
  classId?: number;
  subjectId?: string;
  chapterId?: string;
  pageId?: string;
  language?: Language;
  difficulty?: Difficulty;
}

export interface PublishQuestionsRequest {
  questionIds: string[];
}

export const questionBankApi = {
  getQuestionBank: async (
    filters?: QuestionBankFilters
  ): Promise<QuestionBankItem[]> => {
    const params: Record<string, string> = {};
    if (filters?.classId) params.classId = filters.classId.toString();
    if (filters?.subjectId) params.subjectId = filters.subjectId;
    if (filters?.chapterId) params.chapterId = filters.chapterId;
    if (filters?.pageId) params.pageId = filters.pageId;
    if (filters?.language) params.language = filters.language;
    if (filters?.difficulty) params.difficulty = filters.difficulty;

    const response = await apiClient.get<ApiResponse<QuestionBankItem[]>>(
      "/question-bank",
      { params }
    );
    return extractApiData<QuestionBankItem[]>(response);
  },

  getQuestionBankItem: async (id: string): Promise<QuestionBankItem> => {
    const response = await apiClient.get<ApiResponse<QuestionBankItem>>(
      `/question-bank/${id}`
    );
    return extractApiData<QuestionBankItem>(response);
  },

  publishQuestions: async (
    request: PublishQuestionsRequest
  ): Promise<{ published: number; items: QuestionBankItem[] }> => {
    const response = await apiClient.post<
      ApiResponse<{ published: number; items: QuestionBankItem[] }>
    >("/question-bank/publish", request);
    return extractApiData(response);
  },
};
