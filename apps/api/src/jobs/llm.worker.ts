import dotenv from "dotenv";
dotenv.config();

import { Worker, Job } from "bullmq";
import { llmScheduler } from "../lib/llmScheduler";
import { callGenAISDK } from "../lib/genai.sdk.client";
import { validateGeminiResponse } from "../lib/llmValidator";
import { downloadToBuffer } from "../lib/s3";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { extractTokenUsage, calculateCost } from "../lib/llmCost";

const PROMPT_VERSION = process.env.PROMPT_VERSION || "v1";

function getMathPrompt(): string {
  return `You will receive ONE textbook page image (already provided). Read only visible text.
Ignore headers/footers/captions/page numbers/watermarks.
Language must match the page (Bangla page → Bangla questions; English page → English questions).

CRITICAL: Mathematical Content Processing Rules:
- This page contains MATHEMATICAL CONTENT. Mathematical problems often span multiple lines.
- Identify COMPLETE math problems, exercises, or concepts. A problem may span 1-10 lines or more.
- DO NOT generate questions line-by-line. Treat each complete problem as one unit.
- Generate approximately 2-5 MCQs per page based on complete problems/concepts found.
- Preserve ALL mathematical notation, formulas, equations, and symbols EXACTLY as shown.
- For Bengali math pages: preserve Bengali mathematical terminology exactly (e.g., যোগ, বিয়োগ, গুণ, ভাগ, সমীকরণ, etc.).
- Mathematical expressions must be preserved character-for-character, including all operators, numbers, and variables.

CRITICAL: Bengali/Bangla Character Recognition & Preservation Rules (for Bengali math):
- When reading Bengali text, carefully examine EACH CHARACTER individually. Many Bengali characters look similar but are different (e.g., ন vs ম, র vs ড় vs ঢ়, ত vs ৎ vs থ).
- PAY EXTREME ATTENTION to character-level details. Characters like ন (no), ম (mo), র (ro), ড় (ro), ঢ় (rho), ত (to), ৎ (tto), থ (tho) must be distinguished correctly.
- Before writing any Bengali word, verify character-by-character against the image. Do NOT substitute similar-looking characters.
- COPY EXACTLY as it appears in the image - character by character, stroke by stroke. Do NOT transliterate, romanize, or modify Bengali words.
- Preserve ALL Bengali characters, diacritics, conjunct characters (যুক্তাক্ষর), and spelling exactly as shown in the source text.
- If you are uncertain about a Bengali character after careful examination, preserve it exactly as you see it in the image - do not guess, modify, or substitute.

Task:
- Scan the entire page and identify distinct math problems/exercises/concepts.
- For each identified problem/concept, generate 1-2 relevant MCQs.
- Questions should test problem-solving, conceptual understanding, or application.
- Each MCQ must have exactly 4 options.
- Exactly one correct option per question.
- Include a short explanation showing the solution/work (if applicable).
- Distribute difficulty per page: ~40% easy, 35% medium, 25% hard (math tends to be more challenging).

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
- stem: complete problem statement or concept question; same language as page. For Bengali: preserve exact spelling and mathematical terms.
- options.a–d: mutually exclusive, plausible; same language as page. For Bengali: preserve exact spelling from source.
- correct_option: one of "a","b","c","d" (lowercase).
- explanation: short, why the correct is correct (can include solution steps for math). Same language as page with exact Bengali spelling.
- difficulty: one of "easy","medium","hard"; keep page-level ratio ~40/35/25.
- Do NOT include markdown fences or any text outside the JSON.`;
}

function getNonMathPrompt(): string {
  return `You will receive ONE textbook page image (already provided). Read only visible text.
Ignore headers/footers/captions/page numbers/watermarks.
Language must match the page (Bangla page → Bangla questions; English page → English questions).

CRITICAL: Bengali/Bangla Character Recognition & Preservation Rules:
- When reading Bengali text, carefully examine EACH CHARACTER individually. Many Bengali characters look similar but are different (e.g., ন vs ম, র vs ড় vs ঢ়, ত vs ৎ vs থ).
- PAY EXTREME ATTENTION to character-level details. Characters like ন (no), ম (mo), র (ro), ড় (ro), ঢ় (rho), ত (to), ৎ (tto), থ (tho) must be distinguished correctly.
- Before writing any Bengali word, verify character-by-character against the image. Do NOT substitute similar-looking characters.
- COPY EXACTLY as it appears in the image - character by character, stroke by stroke. Do NOT transliterate, romanize, or modify Bengali words.
- Preserve ALL Bengali characters, diacritics, conjunct characters (যুক্তাক্ষর), and spelling exactly as shown in the source text.
- Do NOT correct, "improve", or guess Bengali spelling - use the exact characters from the textbook page.
- If the image quality makes a character unclear, examine it carefully and compare with surrounding characters for context. Do NOT assume or substitute.
- For Bengali questions, maintain the exact same vocabulary, characters, and terminology used in the source material.
- If you are uncertain about a Bengali character after careful examination, preserve it exactly as you see it in the image - do not guess, modify, or substitute with similar-looking characters.

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
- stem: concise, unambiguous, free of line numbers; same language as page. For Bengali: preserve exact spelling from source.
- options.a–d: mutually exclusive, plausible; same language as page. For Bengali: preserve exact spelling from source.
- correct_option: one of "a","b","c","d" (lowercase).
- explanation: short, why the correct is correct (not a restatement). Same language as page with exact Bengali spelling.
- difficulty: one of "easy","medium","hard"; keep page-level ratio ~50/30/20.
- Do NOT include markdown fences or any text outside the JSON.`;
}

async function processPage(job: Job) {
  const { pageId } = job.data as { pageId: string };

  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: {
      upload: {
        include: {
          subject: true,
        },
      },
    },
  });
  if (!page) throw new Error("Page not found");

  // Detect if this is a math subject
  const subject = page.upload?.subject;
  const subjectName = subject?.name?.toLowerCase() || "";
  const subjectCode = subject?.code?.toLowerCase() || "";
  const isMathSubject =
    subjectName.includes("math") ||
    subjectName.includes("গণিত") ||
    subjectCode === "ma" ||
    subjectCode === "mt";

  logger.info(
    {
      pageId,
      subjectName: subject?.name,
      subjectCode: subject?.code,
      isMathSubject,
    },
    `Processing page - using ${isMathSubject ? "MATH" : "NON-MATH"} prompt`
  );

  // Update status to "generating" when LLM processing starts
  await prisma.page.update({
    where: { id: pageId },
    data: { status: "generating" as any },
  });

  // Download image from S3 to memory (buffer) - will be garbage collected after use
  const imageBuffer = await downloadToBuffer(page.s3PngKey);

  // estimate tokens conservatively by image size heuristic — placeholder
  const estimatedTokens = 2000;

  // compute fail count from past generation attempts
  const failCount = await prisma.pageGenerationAttempt.count({
    where: { pageId, isSuccess: false },
  });
  // Prefer g2.5-pro for better Bengali character recognition (especially first attempt)
  // It has better OCR accuracy for similar-looking Bengali characters
  const preferred =
    failCount >= 2
      ? ["g2.5-pro", "g2.5-flash", "g2.5-flash-lite", "g2.0-flash"]
      : ["g2.5-pro", "g2.5-flash", "g2.5-flash-lite", "g2.0-flash"]; // Start with pro for better accuracy

  const reservation = await llmScheduler.acquire(preferred, estimatedTokens);
  const model = reservation.modelId;

  try {
    // Use different prompts for math vs non-math subjects
    const prompt = isMathSubject ? getMathPrompt() : getNonMathPrompt();
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
      const attempt = await prisma.pageGenerationAttempt.create({
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

      // Record usage event even on validation failure (API call was made)
      const tokenUsage = extractTokenUsage(sdkRaw);
      if (tokenUsage) {
        const estimatedCost = calculateCost(model, tokenUsage.tokensIn, tokenUsage.tokensOut);
        await prisma.llmUsageEvent.create({
          data: {
            pageId: page.id,
            attemptId: attempt.id,
            model,
            tokensIn: tokenUsage.tokensIn,
            tokensOut: tokenUsage.tokensOut,
            estimatedCostUsd: estimatedCost,
          } as any,
        });
      }

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

    // Create page generation attempt record
    const attempt = await prisma.pageGenerationAttempt.create({
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

    // Extract token usage and create LlmUsageEvent
    const tokenUsage = extractTokenUsage(sdkRaw);
    if (tokenUsage) {
      const estimatedCost = calculateCost(model, tokenUsage.tokensIn, tokenUsage.tokensOut);
      await prisma.llmUsageEvent.create({
        data: {
          pageId: page.id,
          attemptId: attempt.id,
          model,
          tokensIn: tokenUsage.tokensIn,
          tokensOut: tokenUsage.tokensOut,
          estimatedCostUsd: estimatedCost,
        } as any,
      });
      logger.info(
        {
          pageId,
          model,
          tokensIn: tokenUsage.tokensIn,
          tokensOut: tokenUsage.tokensOut,
          cost: estimatedCost,
        },
        "LLM usage event recorded"
      );
    } else {
      logger.warn({ pageId, model }, "Could not extract token usage from response");
    }

    await prisma.page.update({
      where: { id: page.id },
      data: { status: "complete" as any, lastGeneratedAt: new Date() },
    });
  } catch (err: any) {
    logger.error({ pageId, err }, "LLM generation failed");
    const attempt = await prisma.pageGenerationAttempt.create({
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

    // Try to extract token usage from error response if available
    const errorResponse = (err as any)?.raw ?? (err as any)?.sdkRaw;
    const tokenUsage = extractTokenUsage(errorResponse);
    if (tokenUsage) {
      const estimatedCost = calculateCost(model, tokenUsage.tokensIn, tokenUsage.tokensOut);
      await prisma.llmUsageEvent.create({
        data: {
          pageId: page.id,
          attemptId: attempt.id,
          model,
          tokensIn: tokenUsage.tokensIn,
          tokensOut: tokenUsage.tokensOut,
          estimatedCostUsd: estimatedCost,
        } as any,
      });
    } else {
      // Record event with null tokens if we can't extract them
      // This ensures we track that an API call was attempted
      await prisma.llmUsageEvent.create({
        data: {
          pageId: page.id,
          attemptId: attempt.id,
          model,
          tokensIn: null,
          tokensOut: null,
          estimatedCostUsd: null,
        } as any,
      });
    }

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
