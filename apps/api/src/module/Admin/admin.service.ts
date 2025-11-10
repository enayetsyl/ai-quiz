import prisma from "../../lib";
import {
  getPaginationParams,
  createPaginationMetadata,
  createPaginatedResponse,
} from "../../utils/pagination";

export interface AdminFilters {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  pageId?: string;
  model?: string;
  isSuccess?: boolean;
}

export async function getPageGenerationAttempts(filters: AdminFilters = {}) {
  const { page, pageSize, skip } = getPaginationParams(filters, 50);

  const where: any = {};

  if (filters.pageId) {
    where.pageId = filters.pageId;
  }

  if (filters.model) {
    where.model = filters.model;
  }

  if (filters.isSuccess !== undefined) {
    where.isSuccess = filters.isSuccess;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  const [attempts, total] = await Promise.all([
    prisma.pageGenerationAttempt.findMany({
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
        llmUsageEvents: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.pageGenerationAttempt.count({ where }),
  ]);

  return createPaginatedResponse(
    attempts,
    createPaginationMetadata(page, pageSize, total)
  );
}

export async function getLlmUsageEvents(filters: AdminFilters = {}) {
  const { page, pageSize, skip } = getPaginationParams(filters, 50);

  const where: any = {};

  if (filters.pageId) {
    where.pageId = filters.pageId;
  }

  if (filters.model) {
    where.model = filters.model;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  const [events, total] = await Promise.all([
    prisma.llmUsageEvent.findMany({
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
        attempt: {
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
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.llmUsageEvent.count({ where }),
  ]);

  // Calculate summary statistics
  const stats = await prisma.llmUsageEvent.aggregate({
    where:
      filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate && { gte: new Date(filters.startDate) }),
              ...(filters.endDate && { lte: new Date(filters.endDate) }),
            },
          }
        : undefined,
    _sum: {
      tokensIn: true,
      tokensOut: true,
      estimatedCostUsd: true,
    },
    _count: {
      id: true,
    },
  });

  return {
    ...createPaginatedResponse(
      events,
      createPaginationMetadata(page, pageSize, total)
    ),
    stats: {
      totalEvents: stats._count.id,
      totalTokensIn: stats._sum.tokensIn || 0,
      totalTokensOut: stats._sum.tokensOut || 0,
      totalCost: stats._sum.estimatedCostUsd
        ? parseFloat(stats._sum.estimatedCostUsd.toString())
        : 0,
    },
  };
}

export async function getPages(filters: AdminFilters = {}) {
  const { page, pageSize, skip } = getPaginationParams(filters, 50);

  const where: any = {};

  if (filters.pageId) {
    where.id = filters.pageId;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  const [pages, total] = await Promise.all([
    prisma.page.findMany({
      where,
      include: {
        upload: {
          include: {
            class: true,
            subject: true,
            chapter: true,
            uploadedByUser: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            questions: true,
            pageGenerationAttempts: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.page.count({ where }),
  ]);

  return createPaginatedResponse(
    pages,
    createPaginationMetadata(page, pageSize, total)
  );
}

export async function getApiTokens(filters: AdminFilters = {}) {
  const { page, pageSize, skip } = getPaginationParams(filters, 50);

  const where: any = {};

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      where.createdAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.createdAt.lte = new Date(filters.endDate);
    }
  }

  const [tokens, total] = await Promise.all([
    prisma.apiToken.findMany({
      where,
      include: {
        createdByUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.apiToken.count({ where }),
  ]);

  return createPaginatedResponse(
    tokens,
    createPaginationMetadata(page, pageSize, total)
  );
}

export async function getAdminDashboardStats() {
  const [
    totalPages,
    totalQuestions,
    totalAttempts,
    successfulAttempts,
    totalLlmEvents,
    totalApiTokens,
    totalTokensUsed,
    totalCost,
  ] = await Promise.all([
    prisma.page.count(),
    prisma.question.count(),
    prisma.pageGenerationAttempt.count(),
    prisma.pageGenerationAttempt.count({ where: { isSuccess: true } }),
    prisma.llmUsageEvent.count(),
    prisma.apiToken.count(),
    prisma.llmUsageEvent.aggregate({
      _sum: {
        tokensIn: true,
        tokensOut: true,
      },
    }),
    prisma.llmUsageEvent.aggregate({
      _sum: {
        estimatedCostUsd: true,
      },
    }),
  ]);

  return {
    totalPages,
    totalQuestions,
    totalAttempts,
    successfulAttempts,
    failedAttempts: totalAttempts - successfulAttempts,
    totalLlmEvents,
    totalApiTokens,
    totalTokensUsed: {
      in: totalTokensUsed._sum.tokensIn || 0,
      out: totalTokensUsed._sum.tokensOut || 0,
      total:
        (totalTokensUsed._sum.tokensIn || 0) +
        (totalTokensUsed._sum.tokensOut || 0),
    },
    totalCost: totalCost._sum.estimatedCostUsd
      ? parseFloat(totalCost._sum.estimatedCostUsd.toString())
      : 0,
  };
}
