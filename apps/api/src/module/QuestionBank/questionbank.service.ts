import prisma from "../../lib";
import { HttpError } from "../../lib/http";
import { getPresignedUrlForKey } from "../../lib/s3";
import { Prisma } from "@prisma/client";

export async function publishQuestionsToBank(
  questionIds: string[],
  userId?: string
) {
  // Verify all questions exist and are approved
  const questions = await prisma.question.findMany({
    where: {
      id: { in: questionIds },
      status: "approved", // Only approved questions can be published
    },
    include: {
      subject: true,
      class: true,
    },
  });

  if (questions.length === 0) {
    throw new HttpError("No approved questions found to publish", 400);
  }

  // Group questions by class and subject for sequence generation
  const groupedByClassSubject = new Map<string, Array<(typeof questions)[0]>>();

  questions.forEach((q: (typeof questions)[0]) => {
    // Use a delimiter that won't appear in UUIDs (like "::")
    const key = `${q.classId}::${q.subjectId}`;
    if (!groupedByClassSubject.has(key)) {
      groupedByClassSubject.set(key, []);
    }
    groupedByClassSubject.get(key)!.push(q);
  });

  const publishedItems: Awaited<ReturnType<typeof prisma.questionBank.create>>[] = [];

  // Process each group
  for (const [key, groupQuestions] of groupedByClassSubject) {
    const [classId, ...subjectIdParts] = key.split("::");
    const subjectId = subjectIdParts.join("::"); // Rejoin in case delimiter appears in UUID (shouldn't, but safe)
    const classIdNum = parseInt(classId, 10);

    // Get or create subject counter
    let counter = await prisma.subjectCounter.findUnique({
      where: {
        classId_subjectId: {
          classId: classIdNum,
          subjectId,
        },
      },
    });

    if (!counter) {
      counter = await prisma.subjectCounter.create({
        data: {
          classId: classIdNum,
          subjectId,
          nextVal: 1,
        },
      });
    }

    // Generate sequence numbers for questions in this group
    for (const question of groupQuestions) {
      const seqNo = counter.nextVal++;
      const subjShortCode = question.subject.code || "XX";

      // Create Question Bank entry
      const qbEntry = await prisma.questionBank.create({
        data: {
          sourceQuestionId: question.id,
          classId: question.classId,
          subjectId: question.subjectId,
          chapterId: question.chapterId,
          pageId: question.pageId,
          language: question.language,
          difficulty: question.difficulty,
          stem: question.stem,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctOption: question.correctOption,
          explanation: question.explanation,
          addedBy: userId || null,
          seqNo,
          subjShortCode,
        },
      });

      // Lock the source question
      await prisma.question.update({
        where: { id: question.id },
        data: { isLockedAfterAdd: true },
      });

      publishedItems.push(qbEntry);
    }

    // Update counter
    await prisma.subjectCounter.update({
      where: {
        classId_subjectId: {
          classId: classIdNum,
          subjectId,
        },
      },
      data: { nextVal: counter.nextVal },
    });
  }

  return { published: publishedItems.length, items: publishedItems };
}

export async function listQuestionBank(filters: {
  classId?: number;
  subjectId?: string;
  chapterId?: string;
  pageId?: string;
  language?: "bn" | "en";
  difficulty?: "easy" | "medium" | "hard";
}) {
  const where: Prisma.QuestionBankWhereInput = {};

  if (filters.classId) where.classId = filters.classId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.chapterId) where.chapterId = filters.chapterId;
  if (filters.pageId) where.pageId = filters.pageId;
  if (filters.language) where.language = filters.language;
  if (filters.difficulty) where.difficulty = filters.difficulty;

  const items = await prisma.questionBank.findMany({
    where,
    include: {
      sourceQuestion: {
        include: {
          page: {
            include: {
              upload: {
                include: {
                  class: true,
                  subject: true,
                  chapter: true,
                },
              },
            },
          },
        },
      },
      class: true,
      subject: true,
      chapter: true,
      page: true,
    },
    orderBy: [{ classId: "asc" }, { subjectId: "asc" }, { seqNo: "asc" }],
  });

  // Add presigned URLs for page images
  const itemsWithUrls = await Promise.all(
    items.map(async (item: (typeof items)[0]) => {
      let pngUrl: string | null = null;
      let thumbUrl: string | null = null;

      const page = item.sourceQuestion?.page || item.page;
      if (page?.s3PngKey) {
        pngUrl = await getPresignedUrlForKey(page.s3PngKey);
      }
      if (page?.s3ThumbKey) {
        thumbUrl = await getPresignedUrlForKey(page.s3ThumbKey);
      }

      return {
        ...item,
        pageImageUrl: pngUrl,
        pageThumbUrl: thumbUrl,
      };
    })
  );

  return itemsWithUrls;
}

export async function fetchQuestionBankForExport(args: {
  ids?: string[];
  filters?: {
    classId?: number;
    subjectId?: string;
    chapterId?: string;
    pageId?: string;
    language?: "bn" | "en";
    difficulty?: "easy" | "medium" | "hard";
  };
}) {
  const where: Prisma.QuestionBankWhereInput = {};
  if (args.ids && args.ids.length > 0) {
    where.id = { in: args.ids };
  } else if (args.filters) {
    const f = args.filters;
    if (f.classId) where.classId = f.classId;
    if (f.subjectId) where.subjectId = f.subjectId;
    if (f.chapterId) where.chapterId = f.chapterId;
    if (f.pageId) where.pageId = f.pageId;
    if (f.language) where.language = f.language;
    if (f.difficulty) where.difficulty = f.difficulty;
  }

  const items = await prisma.questionBank.findMany({
    where,
    include: {
      class: true,
      subject: true,
      chapter: true,
    },
    orderBy: [
      { classId: "asc" },
      { subjectId: "asc" },
      { seqNo: "asc" },
    ],
  });
  return items;
}

export async function getQuestionBankById(itemId: string) {
  const item = await prisma.questionBank.findUnique({
    where: { id: itemId },
    include: {
      sourceQuestion: {
        include: {
          page: {
            include: {
              upload: {
                include: {
                  class: true,
                  subject: true,
                  chapter: true,
                },
              },
            },
          },
        },
      },
      class: true,
      subject: true,
      chapter: true,
      page: true,
    },
  });

  if (!item) {
    throw new HttpError("Question Bank item not found", 404);
  }

  let pngUrl: string | null = null;
  let thumbUrl: string | null = null;

  const page = item.sourceQuestion?.page || item.page;
  if (page?.s3PngKey) {
    pngUrl = await getPresignedUrlForKey(page.s3PngKey);
  }
  if (page?.s3ThumbKey) {
    thumbUrl = await getPresignedUrlForKey(page.s3ThumbKey);
  }

  return {
    ...item,
    pageImageUrl: pngUrl,
    pageThumbUrl: thumbUrl,
  };
}
