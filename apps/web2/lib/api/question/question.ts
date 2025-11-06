import { apiClient, extractApiData, type ApiResponse } from "../axios";

export type QuestionStatus =
  | "not_checked"
  | "approved"
  | "rejected"
  | "needs_fix";
export type Difficulty = "easy" | "medium" | "hard";
export type Language = "bn" | "en";
export type OptionKey = "a" | "b" | "c" | "d";

export interface Question {
  id: string;
  pageId: string;
  classId: number;
  subjectId: string;
  chapterId: string;
  language: Language;
  difficulty: Difficulty;
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: OptionKey;
  explanation: string;
  status: QuestionStatus;
  lineIndex: number;
  isLockedAfterAdd: boolean;
  createdBy?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  page?: {
    id: string;
    pageNumber: number;
    s3PngKey: string;
    s3ThumbKey: string;
    pngUrl?: string;
    thumbUrl?: string;
    upload?: {
      id: string;
      originalFilename: string;
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
    };
  };
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
}

export interface QuestionFilters {
  classId?: number;
  subjectId?: string;
  chapterId?: string;
  pageId?: string;
  status?: QuestionStatus;
  language?: Language;
  difficulty?: Difficulty;
  page?: number;
  pageSize?: number;
}

export interface QuestionPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface QuestionsResponse {
  data: Question[];
  pagination: QuestionPagination;
}

export interface UpdateQuestionData {
  stem?: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: OptionKey;
  explanation?: string;
  status?: QuestionStatus;
}

export interface BulkActionRequest {
  questionIds: string[];
  action: "approve" | "reject" | "needs_fix" | "delete" | "publish";
}

export const questionApi = {
  getQuestions: async (
    filters?: QuestionFilters
  ): Promise<QuestionsResponse> => {
    const params: Record<string, string> = {};
    if (filters?.classId) params.classId = filters.classId.toString();
    if (filters?.subjectId) params.subjectId = filters.subjectId;
    if (filters?.chapterId) params.chapterId = filters.chapterId;
    if (filters?.pageId) params.pageId = filters.pageId;
    if (filters?.status) params.status = filters.status;
    if (filters?.language) params.language = filters.language;
    if (filters?.difficulty) params.difficulty = filters.difficulty;
    if (filters?.page) params.page = filters.page.toString();
    if (filters?.pageSize) params.pageSize = filters.pageSize.toString();

    const response = await apiClient.get<
      ApiResponse<Question[], { pagination: QuestionPagination }>
    >("/questions", { params });
    const data = extractApiData<Question[]>(response);
    const pagination = response.data.meta?.pagination || {
      page: 1,
      pageSize: 20,
      total: data.length,
      totalPages: 1,
    };
    return { data, pagination };
  },

  getQuestion: async (id: string): Promise<Question> => {
    const response = await apiClient.get<ApiResponse<Question>>(
      `/questions/${id}`
    );
    return extractApiData<Question>(response);
  },

  updateQuestion: async (
    id: string,
    data: UpdateQuestionData
  ): Promise<Question> => {
    const response = await apiClient.patch<ApiResponse<Question>>(
      `/questions/${id}`,
      data
    );
    return extractApiData<Question>(response);
  },

  deleteQuestion: async (id: string): Promise<void> => {
    await apiClient.delete(`/questions/${id}`);
  },

  bulkAction: async (
    request: BulkActionRequest
  ): Promise<{ updated?: number; deleted?: number; published?: number }> => {
    const response = await apiClient.post<
      ApiResponse<{ updated?: number; deleted?: number; published?: number }>
    >("/questions/bulk-action", request);
    return extractApiData(response);
  },

  exportQuestions: async (args: {
    format: "csv" | "doc";
    ids?: string[];
    filters?: QuestionFilters;
  }): Promise<Blob> => {
    const params: Record<string, string> = { format: args.format };
    if (args.ids && args.ids.length > 0) {
      params.ids = args.ids.join(",");
    } else if (args.filters) {
      const f = args.filters;
      if (f.classId) params.classId = f.classId.toString();
      if (f.subjectId) params.subjectId = f.subjectId;
      if (f.chapterId) params.chapterId = f.chapterId;
      if (f.pageId) params.pageId = f.pageId;
      if (f.status) params.status = f.status;
      if (f.language) params.language = f.language;
      if (f.difficulty) params.difficulty = f.difficulty;
    }
    const response = await apiClient.get("/questions/export", {
      params,
      responseType: "blob",
    });
    return response.data as Blob;
  },
};
