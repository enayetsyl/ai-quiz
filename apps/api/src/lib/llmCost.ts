/**
 * Calculate estimated cost for Gemini API usage based on token counts
 * Pricing per 1M tokens (as of 2025, subject to change)
 */

const PRICING: Record<string, { input: number; output: number }> = {
  "g2.5-flash": {
    input: 0.075, // $0.075 per 1M input tokens
    output: 0.3, // $0.30 per 1M output tokens
  },
  "g2.5-flash-lite": {
    input: 0.0375, // $0.0375 per 1M input tokens
    output: 0.15, // $0.15 per 1M output tokens
  },
  "g2.0-flash": {
    input: 0.075, // $0.075 per 1M input tokens
    output: 0.3, // $0.30 per 1M output tokens
  },
  "g2.5-pro": {
    input: 1.25, // $1.25 per 1M input tokens
    output: 5.0, // $5.00 per 1M output tokens
  },
};

/**
 * Calculate estimated cost in USD for a given model and token usage
 * @param modelId - Internal model ID (e.g., "g2.5-flash")
 * @param tokensIn - Input tokens
 * @param tokensOut - Output tokens
 * @returns Estimated cost in USD (as a number for Prisma Decimal)
 */
export function calculateCost(
  modelId: string,
  tokensIn: number,
  tokensOut: number
): number {
  const pricing = PRICING[modelId];
  if (!pricing) {
    // Default pricing if model not found (use flash pricing as fallback)
    return (tokensIn / 1_000_000) * 0.075 + (tokensOut / 1_000_000) * 0.3;
  }

  const inputCost = (tokensIn / 1_000_000) * pricing.input;
  const outputCost = (tokensOut / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Extract token usage from Google GenAI SDK response
 * The SDK typically returns usage in `usageMetadata` field
 * @param response - Raw SDK response object
 * @returns Object with tokensIn and tokensOut, or null if not available
 */
export function extractTokenUsage(response: any): {
  tokensIn: number;
  tokensOut: number;
} | null {
  if (!response) return null;

  // Check common response structures
  const usageMetadata =
    response.usageMetadata ||
    response.usage ||
    response.response?.usageMetadata ||
    response.candidates?.[0]?.usageMetadata;

  if (!usageMetadata) return null;

  const tokensIn =
    usageMetadata.promptTokenCount ||
    usageMetadata.inputTokenCount ||
    usageMetadata.totalTokenCount -
      (usageMetadata.outputTokenCount ||
        usageMetadata.candidatesTokenCount ||
        0);

  const tokensOut =
    usageMetadata.candidatesTokenCount ||
    usageMetadata.outputTokenCount ||
    usageMetadata.totalTokenCount - tokensIn;

  if (tokensIn === undefined && tokensOut === undefined) {
    // Try totalTokenCount as fallback
    if (usageMetadata.totalTokenCount) {
      // Estimate 80% input, 20% output if we only have total
      return {
        tokensIn: Math.floor(usageMetadata.totalTokenCount * 0.8),
        tokensOut: Math.ceil(usageMetadata.totalTokenCount * 0.2),
      };
    }
    return null;
  }

  return {
    tokensIn: tokensIn || 0,
    tokensOut: tokensOut || 0,
  };
}
