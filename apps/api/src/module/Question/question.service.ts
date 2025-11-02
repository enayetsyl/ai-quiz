import prisma from "../../lib";
import { HttpError } from "../../lib/http";
import { QuestionFilterParams, BulkActionRequest } from "./question.types";
import { getPresignedUrlForKey } from "../../lib/s3";
import { Prisma } from "@prisma/client";

export async function listQuestions(filters: QuestionFilterParams) {
  const where: Prisma.QuestionWhereInput = {};

  if (filters.classId) where.classId = filters.classId;
  if (filters.subjectId) where.subjectId = filters.subjectId;
  if (filters.chapterId) where.chapterId = filters.chapterId;
  if (filters.pageId) where.pageId = filters.pageId;
  if (filters.status) where.status = filters.status;
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

  const updateData: Prisma.QuestionUpdateInput & { reviewedBy?: string } = { ...data };
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
    case "reject":
    case "needs_fix":
      // Map action to status enum value
      const statusMap: Record<string, "approved" | "rejected" | "needs_fix"> = {
        approve: "approved",
        reject: "rejected",
        needs_fix: "needs_fix",
      };
      // Update status for all questions
      await prisma.question.updateMany({
        where: { id: { in: questionIds } },
        data: {
          status: statusMap[action],
          reviewedBy: userId || null,
        },
      });
      return { updated: questions.length };

    case "delete":
      // Check if any are locked
      const lockedQuestions = questions.filter((q: (typeof questions)[0]) => q.isLockedAfterAdd);
      if (lockedQuestions.length > 0) {
        throw new HttpError(
          `Cannot delete ${lockedQuestions.length} locked question(s)`,
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
