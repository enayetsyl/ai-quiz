import { z } from "zod";

export const patchSettingsSchema = z.object({
  rpmCap: z.number().int().positive().optional(),
  workerConcurrency: z.number().int().positive().optional(),
  queueProvider: z.string().optional(),
  rateLimitSafetyFactor: z.number().positive().optional(),
  tokenEstimateInitial: z.number().int().positive().optional(),
});

export default {
  patchSettingsSchema,
};
