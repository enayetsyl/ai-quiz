export type AppSettings = {
  id: number;
  rpmCap: number;
  workerConcurrency: number;
  queueProvider: string;
  rateLimitSafetyFactor: number;
  tokenEstimateInitial: number;
  apiBearerTokenHash?: string | null;
  updatedAt: string;
};

export default AppSettings;
