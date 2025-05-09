import { PaginationDto } from '../dto/pagination.dto';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

/**
 * Creates an empty paginated result with the provided pagination parameters
 * @param paginationDto Pagination parameters
 * @returns Empty paginated result
 */
export function createEmptyPaginatedResult<T>(
  paginationDto: PaginationDto,
): PaginatedResult<T> {
  const page = paginationDto?.page || 1;
  const limit = paginationDto?.limit || 10;

  return {
    data: [],
    total: 0,
    page,
    limit,
    pages: 0,
  };
}

/**
 * Creates a paginated result from a list of items
 * @param items List of items to paginate
 * @param total Total number of items
 * @param paginationDto Pagination parameters
 * @returns Paginated result
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  paginationDto: PaginationDto,
): PaginatedResult<T> {
  const page = paginationDto?.page || 1;
  const limit = paginationDto?.limit || 10;
  const pages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    data: items,
    total,
    page,
    limit,
    pages,
  };
}
