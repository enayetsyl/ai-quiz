import { z } from "zod";

export const OptionSchema = z.object({
  a: z.string(),
  b: z.string(),
  c: z.string(),
  d: z.string(),
});

export const GeneratedQuestionSchema = z.object({
  stem: z.string(),
  options: OptionSchema,
  correct_option: z.enum(["a", "b", "c", "d"]),
  explanation: z.string(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

export const GeminiResponseSchema = z.object({
  questions: z.array(GeneratedQuestionSchema),
});

export function validateGeminiResponse(raw: any) {
  return GeminiResponseSchema.parse(raw);
}

export default { validateGeminiResponse };
