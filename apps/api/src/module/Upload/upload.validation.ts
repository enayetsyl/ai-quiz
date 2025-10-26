import { z } from "zod";

export const uploadMetadataSchema = z.object({
  classId: z.number().int().min(6).max(10),
  subjectId: z.string().uuid(),
  chapterId: z.string().uuid(),
});

export default { uploadMetadataSchema };
