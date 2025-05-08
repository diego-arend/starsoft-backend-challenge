import { Test, TestingModule } from '@nestjs/testing';
import { PaginationService } from './pagination.service';
import { PaginationDto } from '../dto/pagination.dto';

describe('PaginationService', () => {
  let service: PaginationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PaginationService],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  describe('getPaginationParams', () => {
    it('should return default pagination params when no DTO is provided', () => {
      const result = service.getPaginationParams();

      expect(result).toEqual({
        page: 1,
        limit: 10,
        skip: 0,
      });
    });

    it('should calculate correct skip value for page 1', () => {
      const dto: PaginationDto = { page: 1, limit: 15 };

      const result = service.getPaginationParams(dto);

      expect(result.skip).toBe(0);
    });

    it('should calculate correct skip value for page 2', () => {
      const dto: PaginationDto = { page: 2, limit: 20 };

      const result = service.getPaginationParams(dto);

      expect(result.skip).toBe(20);
    });

    it('should use provided page and limit values', () => {
      const dto: PaginationDto = { page: 5, limit: 30 };

      const result = service.getPaginationParams(dto);

      expect(result.page).toBe(5);
      expect(result.limit).toBe(30);
      expect(result.skip).toBe(120);
    });

    it('should handle undefined values and use defaults', () => {
      const dto: PaginationDto = { page: undefined, limit: undefined };

      const result = service.getPaginationParams(dto);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });
  });

  describe('createPaginatedResult', () => {
    it('should create a paginated result object with correct structure', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const total = 10;
      const page = 1;
      const limit = 3;

      const result = service.createPaginatedResult(data, total, page, limit);

      expect(result).toEqual({
        data,
        total,
        page,
        limit,
        pages: 4,
      });
    });

    it('should calculate correct number of pages', () => {
      const testCases = [
        { total: 10, limit: 10, expected: 1 },
        { total: 11, limit: 10, expected: 2 },
        { total: 25, limit: 10, expected: 3 },
        { total: 0, limit: 10, expected: 0 },
      ];

      testCases.forEach(({ total, limit, expected }) => {
        const result = service.createPaginatedResult([], total, 1, limit);

        expect(result.pages).toBe(expected);
      });
    });

    it('should handle empty data array', () => {
      const data: any[] = [];
      const total = 0;

      const result = service.createPaginatedResult(data, total, 1, 10);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.pages).toBe(0);
    });
  });

  describe('getElasticsearchPaginationParams', () => {
    it('should convert pagination DTO to Elasticsearch parameters', () => {
      const dto: PaginationDto = { page: 3, limit: 15 };

      const result = service.getElasticsearchPaginationParams(dto);

      expect(result).toEqual({
        from: 30,
        size: 15,
        page: 3,
        limit: 15,
      });
    });

    it('should use default values when no DTO is provided', () => {
      const result = service.getElasticsearchPaginationParams();

      expect(result).toEqual({
        from: 0,
        size: 10,
        page: 1,
        limit: 10,
      });
    });

    it('should handle partial DTO with only page specified', () => {
      const dto: PaginationDto = { page: 4 };

      const result = service.getElasticsearchPaginationParams(dto);

      expect(result).toEqual({
        from: 30,
        size: 10,
        page: 4,
        limit: 10,
      });
    });

    it('should handle partial DTO with only limit specified', () => {
      const dto: PaginationDto = { limit: 25 };

      const result = service.getElasticsearchPaginationParams(dto);

      expect(result).toEqual({
        from: 0,
        size: 25,
        page: 1,
        limit: 25,
      });
    });
  });
});
