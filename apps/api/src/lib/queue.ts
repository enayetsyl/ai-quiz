import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379"
);

export const rasterizeQueue = new Queue("rasterize", { connection });
export const generationQueue = new Queue("generation", { connection });

export default { rasterizeQueue, generationQueue };
