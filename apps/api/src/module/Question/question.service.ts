import prisma from "../../lib";
import { HttpError } from "../../lib/http";
import { QuestionFilterParams, BulkActionRequest } from "./question.types";
import { getPresignedUrlForKey } from "../../lib/s3";
import { Prisma } from "@prisma/client";
import { publishQuestionsToBank } from "../QuestionBank/questionbank.service";

export async function listQuestions(filters: QuestionFilterParams) {
  const where: Prisma.QuestionWhereInput = {};

  if (filters.classId) where.classId = filters.classId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.chapterId) where.chapterId = filters.chapterId;
  if (filters.pageId) where.pageId = filters.pageId;

  // If status filter is explicitly set, use it
  // Otherwise, exclude approved and rejected questions by default
  if (filters.status) {
    where.status = filters.status;
  } else {
    // Exclude approved and rejected questions when no status filter is provided
    where.status = {
      notIn: ["approved", "rejected"],
    };
  }

  if (filters.language) where.language = filters.language;
  if (filters.difficulty) where.difficulty = filters.difficulty;

  const page = filters.page || 1;
  const pageSize = filters.pageSize || 20;
  const skip = (page - 1) * pageSize;

  // Get total count for pagination
  const total = await prisma.question.count({ where });

  const questions = await prisma.question.findMany({
    where,
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
      class: true,
      subject: true,
      chapter: true,
    },
    orderBy: [
      { classId: "asc" },
      { subjectId: "asc" },
      { chapterId: "asc" },
      { pageId: "asc" },
      { lineIndex: "asc" },
    ],
    skip,
    take: pageSize,
  });

  // Add presigned URLs for page images
  const questionsWithUrls = await Promise.all(
    questions.map(async (q: (typeof questions)[0]) => {
      let pngUrl: string | null = null;
      let thumbUrl: string | null = null;

      if (q.page?.s3PngKey) {
        pngUrl = await getPresignedUrlForKey(q.page.s3PngKey);
      }
      if (q.page?.s3ThumbKey) {
        thumbUrl = await getPresignedUrlForKey(q.page.s3ThumbKey);
      }

      return {
        ...q,
        page: q.page
          ? {
              ...q.page,
              pngUrl,
              thumbUrl,
            }
          : null,
      };
    })
  );

  return {
    data: questionsWithUrls,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getQuestionById(questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
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
      class: true,
      subject: true,
      chapter: true,
    },
  });

  if (!question) {
    throw new HttpError("Question not found", 404);
  }

  let pngUrl: string | null = null;
  let thumbUrl: string | null = null;

  if (question.page?.s3PngKey) {
    pngUrl = await getPresignedUrlForKey(question.page.s3PngKey);
  }
  if (question.page?.s3ThumbKey) {
    thumbUrl = await getPresignedUrlForKey(question.page.s3ThumbKey);
  }

  return {
    ...question,
    page: question.page
      ? {
          ...question.page,
          pngUrl,
          thumbUrl,
        }
      : null,
  };
}

export async function updateQuestion(
  questionId: string,
  data: {
    stem?: string;
    optionA?: string;
    optionB?: string;
    optionC?: string;
    optionD?: string;
    correctOption?: "a" | "b" | "c" | "d";
    explanation?: string;
    status?: "not_checked" | "approved" | "rejected" | "needs_fix";
  },
  reviewedBy?: string
) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    throw new HttpError("Question not found", 404);
  }

  if (question.isLockedAfterAdd) {
    throw new HttpError(
      "Question is locked after being added to Question Bank",
      403
    );
  }

  const updateData: Prisma.QuestionUpdateInput & { reviewedBy?: string } = {
    ...data,
  };
  if (data.status && reviewedBy) {
    updateData.reviewedBy = reviewedBy;
  }

  return await prisma.question.update({
    where: { id: questionId },
    data: updateData as Prisma.QuestionUpdateInput,
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
      class: true,
      subject: true,
      chapter: true,
    },
  });
}

export async function deleteQuestion(questionId: string) {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });

  if (!question) {
    throw new HttpError("Question not found", 404);
  }

  await prisma.question.delete({
    where: { id: questionId },
  });

  return { success: true };
}

export async function bulkActionQuestions(
  request: BulkActionRequest,
  userId?: string
) {
  const { questionIds, action } = request;

  // Verify all questions exist
  const questions = await prisma.question.findMany({
    where: { id: { in: questionIds } },
  });

  if (questions.length !== questionIds.length) {
    throw new HttpError("Some questions not found", 404);
  }

  switch (action) {
    case "approve":
      // Map action to status enum value
      const approveStatusMap: Record<string, "approved"> = {
        approve: "approved",
      };
      // Update status for all questions to approved
      const updateResult = await prisma.question.updateMany({
        where: { id: { in: questionIds } },
        data: {
          status: approveStatusMap[action],
          reviewedBy: userId || null,
        },
      });

      // Verify questions still exist after update (defensive check)
      const questionsAfterUpdate = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true },
      });

      if (questionsAfterUpdate.length !== questionIds.length) {
        console.error(
          `[bulkActionQuestions] Warning: Some questions were deleted during approval. Expected ${questionIds.length}, found ${questionsAfterUpdate.length}`
        );
      }

      // Automatically publish approved questions
      try {
        const publishResult = await publishQuestionsToBank(questionIds, userId);

        // Verify questions still exist after publishing (defensive check)
        const questionsAfterPublish = await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true },
        });

        if (questionsAfterPublish.length !== questionIds.length) {
          console.error(
            `[bulkActionQuestions] Warning: Some questions were deleted during publishing. Expected ${questionIds.length}, found ${questionsAfterPublish.length}`
          );
        }

        return {
          updated: questions.length,
          published: publishResult.published,
        };
      } catch (publishError) {
        // If publishing fails, still return success for approval
        // The questions are approved but not yet published

        // Verify questions still exist after failed publish (defensive check)
        const questionsAfterFailedPublish = await prisma.question.findMany({
          where: { id: { in: questionIds } },
          select: { id: true },
        });

        if (questionsAfterFailedPublish.length !== questionIds.length) {
          console.error(
            `[bulkActionQuestions] Warning: Some questions were deleted during failed publishing. Expected ${questionIds.length}, found ${questionsAfterFailedPublish.length}`
          );
        }

        return {
          updated: questions.length,
          published: 0,
          publishError:
            publishError instanceof Error
              ? publishError.message
              : "Failed to publish",
        };
      }

    case "reject":
      // Check if any are locked
      const lockedQuestions = questions.filter(
        (q: (typeof questions)[0]) => q.isLockedAfterAdd
      );
      if (lockedQuestions.length > 0) {
        throw new HttpError(
          `Cannot delete ${lockedQuestions.length} locked question(s)`,
          403
        );
      }
      // Delete rejected questions instead of updating status
      await prisma.question.deleteMany({
        where: { id: { in: questionIds } },
      });
      return { deleted: questions.length };

    case "needs_fix":
      // Map action to status enum value
      const needsFixStatusMap: Record<string, "needs_fix"> = {
        needs_fix: "needs_fix",
      };
      // Update status for all questions
      await prisma.question.updateMany({
        where: { id: { in: questionIds } },
        data: {
          status: needsFixStatusMap[action],
          reviewedBy: userId || null,
        },
      });
      return { updated: questions.length };

    case "delete":
      // Check if any are locked
      const lockedQuestionsForDelete = questions.filter(
        (q: (typeof questions)[0]) => q.isLockedAfterAdd
      );
      if (lockedQuestionsForDelete.length > 0) {
        throw new HttpError(
          `Cannot delete ${lockedQuestionsForDelete.length} locked question(s)`,
          403
        );
      }
      await prisma.question.deleteMany({
        where: { id: { in: questionIds } },
      });
      return { deleted: questions.length };

    case "publish":
      // Add to Question Bank - will be handled separately
      return { message: "Publish action handled by QuestionBank service" };

    default:
      throw new HttpError(`Unknown action: ${action}`, 400);
  }
}

export async function fetchQuestionsForExport(args: {
  ids?: string[];
  filters?: Partial<
    Pick<
      QuestionFilterParams,
      | "classId"
      | "subjectId"
      | "chapterId"
      | "pageId"
      | "status"
      | "language"
      | "difficulty"
    >
  >;
}) {
  const where: Prisma.QuestionWhereInput = {};
  if (args.ids && args.ids.length > 0) {
    where.id = { in: args.ids };
  } else if (args.filters) {
    const f = args.filters;
    if (f.classId) where.classId = f.classId;
    if (f.subjectId) where.subjectId = f.subjectId;
    if (f.chapterId) where.chapterId = f.chapterId;
    if (f.pageId) where.pageId = f.pageId;
    if (f.status) where.status = f.status;
    if (f.language) where.language = f.language;
    if (f.difficulty) where.difficulty = f.difficulty;
  }

  const items = await prisma.question.findMany({
    where,
    include: {
      class: true,
      subject: true,
      chapter: true,
    },
    orderBy: [
      { classId: "asc" },
      { subjectId: "asc" },
      { chapterId: "asc" },
      { pageId: "asc" },
      { lineIndex: "asc" },
    ],
  });

  return items;
}
