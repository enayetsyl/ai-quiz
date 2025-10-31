import queue from "../../lib/queue";

export async function enqueuePageGeneration(pageId: string) {
  await queue.generationQueue.add(
    "generate:page",
    { pageId },
    { attempts: 3, backoff: { type: "exponential", delay: 5000 } }
  );
}

export default { enqueuePageGeneration };
