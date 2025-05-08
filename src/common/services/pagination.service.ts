import { Injectable } from '@nestjs/common';
import { PaginationDto } from '../dto/pagination.dto';
import { PaginatedResult } from '../interfaces/paginated-result.interface';

/**
 * Service for handling pagination operations across the application
 */
@Injectable()
export class PaginationService {
  /**
   * Calculates pagination parameters from a DTO
   *
   * @param paginationDto - Pagination parameters provided by client
   * @returns Object containing page number, limit and number of items to skip
   */
  getPaginationParams(paginationDto: PaginationDto = {}): {
    page: number;
    limit: number;
    skip: number;
  } {
    const page = paginationDto.page || 1;
    const limit = paginationDto.limit || 10;
    const skip = (page - 1) * limit;

    return { page, limit, skip };
  }

  /**
   * Creates a paginated result object
   *
   * @param data - Array of items for the current page
   * @param total - Total number of items across all pages
   * @param page - Current page number
   * @param limit - Number of items per page
   * @returns Standardized paginated result object
   */
  createPaginatedResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Creates pagination parameters for Elasticsearch queries
   *
   * @param paginationDto - Pagination parameters provided by client
   * @returns Object with Elasticsearch-specific pagination parameters
   */
  getElasticsearchPaginationParams(paginationDto: PaginationDto = {}): {
    from: number;
    size: number;
    page: number;
    limit: number;
  } {
    const { page, limit, skip } = this.getPaginationParams(paginationDto);

    return {
      from: skip,
      size: limit,
      page,
      limit,
    };
  }
}
