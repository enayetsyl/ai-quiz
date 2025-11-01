export interface QuestionDto {
  id: string;
  pageId: string;
  classId: number;
  subjectId: string;
  chapterId: string;
  language: "bn" | "en";
  difficulty: "easy" | "medium" | "hard";
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "a" | "b" | "c" | "d";
  explanation: string;
  status: "not_checked" | "approved" | "rejected" | "needs_fix";
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
}

export interface QuestionFilterParams {
  classId?: number;
  subjectId?: string;
  chapterId?: string;
  pageId?: string;
  status?: "not_checked" | "approved" | "rejected" | "needs_fix";
  language?: "bn" | "en";
  difficulty?: "easy" | "medium" | "hard";
  page?: number;
  pageSize?: number;
}

export interface BulkActionRequest {
  questionIds: string[];
  action: "approve" | "reject" | "needs_fix" | "delete" | "publish";
}
