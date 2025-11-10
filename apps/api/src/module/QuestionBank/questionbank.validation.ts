import { z } from "zod";

export const questionBankFilterSchema = z.object({
  classId: z.coerce.number().int().min(1).max(10).optional(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  language: z.enum(["bn", "en"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

export const publishQuestionsSchema = z.object({
  questionIds: z.array(z.string().uuid()).min(1),
});

export const exportQuerySchema = z.object({
  ids: z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
    .refine((arr) => arr.every((id) => z.string().uuid().safeParse(id).success), {
      message: "ids must be comma-separated UUIDs",
    })
    .optional(),
  format: z.enum(["doc"]).default("doc"),
  variant: z.enum(["full", "stem_options"]).default("full"),
  classId: z.coerce.number().int().min(1).max(10).optional(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  pageId: z.string().uuid().optional(),
  language: z.enum(["bn", "en"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
});

