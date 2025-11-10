export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  skip: number;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMetadata;
}

/**
 * Calculates pagination parameters from filters
 * @param filters - Object containing optional page and pageSize
 * @param defaultPageSize - Default page size if not provided (default: 20)
 * @returns Pagination result with page, pageSize, and skip values
 */
export function getPaginationParams(
  filters: PaginationParams,
  defaultPageSize: number = 20
): PaginationResult {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || defaultPageSize;
  const skip = (page - 1) * pageSize;

  return {
    page,
    pageSize,
    skip,
  };
}

/**
 * Creates pagination metadata from pagination params and total count
 * @param page - Current page number
 * @param pageSize - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata
 */
export function createPaginationMetadata(
  page: number,
  pageSize: number,
  total: number
): PaginationMetadata {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Creates a paginated response with data and pagination metadata
 * @param data - Array of items
 * @param pagination - Pagination metadata
 * @returns Paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  pagination: PaginationMetadata
): PaginatedResponse<T> {
  return {
    data,
    pagination,
  };
}


