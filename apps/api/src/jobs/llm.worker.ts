import dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import { llmScheduler } from "../lib/llmScheduler";
import { callGenAISDK } from "../lib/genai.sdk.client";
import { validateGeminiResponse } from "../lib/llmValidator";
import { downloadToBuffer } from "../lib/s3";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const PROMPT_VERSION = process.env.PROMPT_VERSION || "v1";

async function processPage(job: Job) {
  const { pageId } = job.data as { pageId: string };

  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) throw new Error("Page not found");

  // Download image from S3 to memory (buffer) - will be garbage collected after use
  const imageBuffer = await downloadToBuffer(page.s3PngKey);

  // estimate tokens conservatively by image size heuristic — placeholder
  const estimatedTokens = 2000;

  // compute fail count from past generation attempts
  const failCount = await prisma.pageGenerationAttempt.count({
    where: { pageId, isSuccess: false },
  });
  const preferred =
    failCount >= 2
      ? ["g2.5-pro", "g2.5-flash", "g2.5-flash-lite", "g2.0-flash"]
      : ["g2.5-flash", "g2.5-flash-lite", "g2.0-flash"];

  const reservation = await llmScheduler.acquire(preferred, estimatedTokens);
  const model = reservation.modelId;

  try {
    const prompt = `You will receive ONE textbook page image (already provided). Read only visible text.
Ignore headers/footers/captions/page numbers/watermarks. Skip any line < 20 characters.
Language must match the page (Bangla page → Bangla questions; English page → English questions).

Task:
- Generate approximately one MCQ per eligible line.
- Each MCQ must have exactly 4 options.
- Exactly one correct option per question.
- Include a short explanation.
- Distribute difficulty per page: ~50% easy, 30% medium, 20% hard.

Output format (STRICT):
- Return a single raw JSON object (UTF-8). NO markdown, NO code fences, NO comments, NO extra keys.
- The JSON MUST match this schema exactly:
{
  "questions": [
    {
      "stem": "string",
      "options": { "a": "string", "b": "string", "c": "string", "d": "string" },
      "correct_option": "a|b|c|d",
      "explanation": "string",
      "difficulty": "easy|medium|hard"
    }
  ]
}

Field rules:
- stem: concise, unambiguous, free of line numbers; same language as page.
- options.a–d: mutually exclusive, plausible; same language as page.
- correct_option: one of "a","b","c","d" (lowercase).
- explanation: short, why the correct is correct (not a restatement).
- difficulty: one of "easy","medium","hard"; keep page-level ratio ~50/30/20.
- Do NOT include markdown fences or any text outside the JSON.`;
    // Call GenAI SDK with downloaded image buffer (sent as base64 inlineData)
    const resp = await callGenAISDK(model, prompt, imageBuffer);
    const sdkRaw = resp.sdkRaw ?? resp.raw;
    try {
      const preview = JSON.stringify(sdkRaw)?.slice(0, 2000);
      logger.info({ pageId, model, preview }, "GenAI raw response preview");
    } catch (_) {
      // no-op
    }

    // Try to locate a JSON payload with { questions: [...] }
    let parsedCandidate: any = resp.raw ?? undefined;
    if (!parsedCandidate || !parsedCandidate.questions) {
      const text = sdkRaw?.text ?? sdkRaw?.output?.[0]?.content?.[0]?.text;
      if (typeof text === "string" && text.length > 0) {
        // 1) Strip markdown code fences if present
        let cleaned = text.trim();
        const fenceMatch = cleaned.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
        if (fenceMatch && fenceMatch[1]) {
          cleaned = fenceMatch[1].trim();
        }
        // 2) Try direct JSON.parse
        try {
          parsedCandidate = JSON.parse(cleaned);
        } catch (_) {
          // 3) As a last resort, extract first {...} block
          try {
            const start = cleaned.indexOf("{");
            const end = cleaned.lastIndexOf("}");
            if (start !== -1 && end !== -1 && end > start) {
              const maybe = cleaned.slice(start, end + 1);
              parsedCandidate = JSON.parse(maybe);
            }
          } catch (_) {
            parsedCandidate = undefined;
          }
        }
      }
    }

    // Validate parsed candidate strictly
    let parsed;
    try {
      parsed = validateGeminiResponse(parsedCandidate);
    } catch (zErr: any) {
      // record failure attempt with SDK raw response for debugging
      try {
        const preview = JSON.stringify(sdkRaw)?.slice(0, 2000);
        logger.error(
          { pageId, model, preview },
          "GenAI validation failed preview"
        );
      } catch (_) {}
      await prisma.pageGenerationAttempt.create({
        data: {
          pageId: page.id,
          attemptNo: (await getLastAttemptNo(page.id)) + 1,
          model,
          isSuccess: false,
          errorMessage: zErr?.message ?? String(zErr),
          requestExcerpt: JSON.stringify({ model, prompt: "<omitted>" }),
          responseExcerpt: JSON.stringify(sdkRaw),
          promptVersion: PROMPT_VERSION,
        } as any,
      });
      throw zErr;
    }

    // persist questions — fetch upload for class/subject/chapter
    const upload = await prisma.upload.findUnique({
      where: { id: page.uploadId },
    });
    // compute base line index offset to avoid unique constraint violations
    const maxLineIndex = await prisma.question.aggregate({
      _max: { lineIndex: true },
      where: { pageId: page.id },
    });
    const baseIndex = (maxLineIndex._max.lineIndex ?? -1) + 1;
    for (let i = 0; i < parsed.questions.length; i++) {
      const q = parsed.questions[i];
      await prisma.question.create({
        data: {
          page: { connect: { id: page.id } },
          class: { connect: { id: upload?.classId as any } },
          subject: { connect: { id: upload?.subjectId as any } },
          chapter: { connect: { id: upload?.chapterId as any } },
          language: (page.language ?? "bn") as any,
          difficulty: q.difficulty as any,
          stem: q.stem,
          optionA: q.options.a,
          optionB: q.options.b,
          optionC: q.options.c,
          optionD: q.options.d,
          correctOption: q.correct_option,
          explanation: q.explanation,
          status: "not_checked",
          lineIndex: baseIndex + i,
        } as any,
      });
    }

    await prisma.pageGenerationAttempt.create({
      data: {
        pageId: page.id,
        attemptNo: (await getLastAttemptNo(page.id)) + 1,
        model,
        isSuccess: true,
        requestExcerpt: JSON.stringify({ model, prompt: "<omitted>" }),
        responseExcerpt: JSON.stringify(sdkRaw),
        promptVersion: PROMPT_VERSION,
      } as any,
    });

    await prisma.page.update({
      where: { id: page.id },
      data: { status: "complete" as any, lastGeneratedAt: new Date() },
    });
  } catch (err: any) {
    logger.error({ pageId, err }, "LLM generation failed");
    await prisma.pageGenerationAttempt.create({
      data: {
        pageId: page.id,
        attemptNo: (await getLastAttemptNo(page.id)) + 1,
        model,
        isSuccess: false,
        errorMessage: err?.message ?? String(err),
        requestExcerpt: JSON.stringify({ model, prompt: "<omitted>" }),
        responseExcerpt: JSON.stringify(
          (err as any)?.raw ?? (err as any)?.sdkRaw ?? err?.message
        ),
        promptVersion: PROMPT_VERSION,
      } as any,
    });

    // mark page as failed (attempts are recorded separately)
    await prisma.page.update({
      where: { id: page.id },
      data: { status: "failed" as any },
    });

    throw err;
  }
}

async function getLastAttemptNo(pageId: string) {
  const last = await prisma.pageGenerationAttempt.findFirst({
    where: { pageId },
    orderBy: { attemptNo: "desc" },
  });
  return last?.attemptNo ?? 0;
}

const worker = new Worker(
  "generation",
  async (job) => {
    if (job.name === "generate:page") return processPage(job);
    return;
  },
  {
    connection: {
      host: process.env.REDIS_URL || "127.0.0.1",
      port: 6379,
    } as any,
    concurrency: Number(process.env.WORKER_CONCURRENCY || 5),
  }
);

worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "Generation job failed");
});

export default worker;
