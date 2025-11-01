import { z } from "zod";

export const updateQuestionSchema = z.object({
  stem: z.string().min(1).optional(),
  optionA: z.string().min(1).optional(),
  optionB: z.string().min(1).optional(),
  optionC: z.string().min(1).optional(),
  optionD: z.string().min(1).optional(),
  correctOption: z.enum(["a", "b", "c", "d"]).optional(),
  explanation: z.string().optional(),
  status: z
    .enum(["not_checked", "approved", "rejected", "needs_fix"])
    .optional(),
});

export const bulkActionSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
  action: z.enum(["approve", "reject", "needs_fix", "delete", "publish"]),
});

export const questionFilterSchema = z.object({
  classId: z.coerce.number().int().min(6).max(10).optional(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  status: z
    .enum(["not_checked", "approved", "rejected", "needs_fix"])
    .optional(),
  language: z.enum(["bn", "en"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const validation = {
  updateQuestionSchema,
  bulkActionSchema,
  questionFilterSchema,
};

export default validation;

export type UpdateQuestion = z.infer<typeof updateQuestionSchema>;
export type BulkAction = z.infer<typeof bulkActionSchema>;
export type QuestionFilter = z.infer<typeof questionFilterSchema>;
