import { EventEmitter } from "events";

type ModelConfig = {
  id: string;
  rpm: number;
  tpm: number;
  rpd: number;
};

type Bucket = {
  capacity: number;
  tokens: number;
  fillRatePerMin: number;
};

const DEFAULT_SAFETY = Number(process.env.LLM_SAFETY_FACTOR || 1.2);
const MIN_TOKENS_PER_REQ = Number(process.env.LLM_MIN_TOKENS_PER_REQ || 1500);

// Hard-coded per §21 — can be extended to read from settings
const MODELS: ModelConfig[] = [
  { id: "g2.5-flash", rpm: 10, tpm: 250_000, rpd: 250 },
  { id: "g2.5-flash-lite", rpm: 15, tpm: 250_000, rpd: 1000 },
  { id: "g2.0-flash", rpm: 15, tpm: 1_000_000, rpd: 200 },
  { id: "g2.5-pro", rpm: 5, tpm: 125_000, rpd: 100 },
];

class LlmScheduler extends EventEmitter {
  private buckets: Map<string, { a: Bucket; b: Bucket; c: Bucket }> = new Map();

  constructor() {
    super();
    this.initBuckets();
    // daily reset at 00:00 UTC
    setInterval(() => this.resetDaily(), 60_000);
  }

  private initBuckets() {
    const minutesPerDay = 24 * 60;
    for (const m of MODELS) {
      const a: Bucket = {
        capacity: m.rpm,
        tokens: m.rpm,
        fillRatePerMin: m.rpm,
      };
      const b: Bucket = {
        capacity: m.tpm,
        tokens: m.tpm,
        fillRatePerMin: Math.floor(m.tpm / minutesPerDay),
      };
      const c: Bucket = {
        capacity: m.rpd,
        tokens: m.rpd,
        fillRatePerMin: Math.floor(m.rpd / minutesPerDay),
      };
      this.buckets.set(m.id, { a, b, c });
    }
  }

  private resetDaily() {
    for (const m of MODELS) {
      const entry = this.buckets.get(m.id)!;
      entry.c.tokens = entry.c.capacity;
    }
  }

  private effectiveTokensEstimate(estimated: number) {
    const eff = Math.max(
      MIN_TOKENS_PER_REQ,
      Math.ceil(DEFAULT_SAFETY * estimated)
    );
    return eff;
  }

  // Attempt to acquire tokens on first available model in preferred list
  async acquire(
    preferred: string[],
    estimatedTokens: number
  ): Promise<{ modelId: string; tokensUsed: number }> {
    const tokensNeeded = this.effectiveTokensEstimate(estimatedTokens);
    while (true) {
      for (const modelId of preferred) {
        const b = this.buckets.get(modelId);
        if (!b) continue;
        if (b.a.tokens >= 1 && b.b.tokens >= tokensNeeded && b.c.tokens >= 1) {
          b.a.tokens -= 1;
          b.b.tokens -= tokensNeeded;
          b.c.tokens -= 1;
          return { modelId, tokensUsed: tokensNeeded };
        }
      }
      // sleep 500ms and retry
      await new Promise((r) => setTimeout(r, 500));
      this.refillBuckets();
    }
  }

  private refillBuckets() {
    for (const m of MODELS) {
      const entry = this.buckets.get(m.id)!;
      entry.a.tokens = Math.min(
        entry.a.capacity,
        entry.a.tokens + entry.a.fillRatePerMin / 60
      );
      entry.b.tokens = Math.min(
        entry.b.capacity,
        entry.b.tokens + entry.b.fillRatePerMin / 60
      );
      entry.c.tokens = Math.min(
        entry.c.capacity,
        entry.c.tokens + entry.c.fillRatePerMin / 60
      );
    }
  }
}

export const llmScheduler = new LlmScheduler();

export default llmScheduler;
