import multer from "multer";

/**
 * Multer configuration for file uploads
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB limit
  },
});

/**
 * Calculates the overall status of an upload based on page statuses
 */
export function calculateUploadStatus(pages: Array<{ status: string }>): {
  status: "pending" | "processing" | "failed" | "completed" | "partial";
  completedCount: number;
  failedCount: number;
  processingCount: number;
} {
  const completedCount = pages.filter((p) => p.status === "complete").length;
  const failedCount = pages.filter((p) => p.status === "failed").length;
  const processingCount = pages.filter(
    (p) => p.status === "queued" || p.status === "generating"
  ).length;

  let overallStatus: "pending" | "processing" | "failed" | "completed" | "partial" =
    "pending";

  if (pages.length === 0) {
    overallStatus = "pending";
  } else if (processingCount > 0) {
    overallStatus = "processing";
  } else if (failedCount === pages.length) {
    overallStatus = "failed";
  } else if (completedCount === pages.length) {
    overallStatus = "completed";
  } else if (completedCount > 0 || failedCount > 0) {
    overallStatus = "partial";
  }

  return {
    status: overallStatus,
    completedCount,
    failedCount,
    processingCount,
  };
}

