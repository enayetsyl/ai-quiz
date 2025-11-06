import { z } from "zod";

export const createSubjectSchema = z.object({
  classId: z.number().int().min(1).max(10),
  name: z.string().min(1),
  code: z
    .string()
    .regex(/^[A-Z]{2}$/, "Subject code must be 2 uppercase ASCII letters")
    .optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const createChapterSchema = z.object({
  subjectId: z.string().uuid(),
  name: z.string().min(1),
  ordinal: z.number().int().min(1),
});

export const updateChapterSchema = createChapterSchema.partial();

export const createClassSchema = z.object({
  id: z.number().int().min(1).max(10),
  displayName: z.string().min(1),
});

export const updateClassSchema = createClassSchema.partial();

const validation = {
  createSubjectSchema,
  updateSubjectSchema,
  createChapterSchema,
  updateChapterSchema,
  createClassSchema,
  updateClassSchema,
};

export default validation;

export type CreateSubject = z.infer<typeof createSubjectSchema>;
export type CreateChapter = z.infer<typeof createChapterSchema>;
export type CreateClass = z.infer<typeof createClassSchema>;
