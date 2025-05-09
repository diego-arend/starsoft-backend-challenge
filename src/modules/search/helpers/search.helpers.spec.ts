import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Test } from '@nestjs/testing';
import { executeSearch } from './search.helpers';
import {
  SearchServiceUnavailableException,
  SearchExecutionException,
} from '../exceptions/search-exceptions';
import * as elasticsearchHelpers from './elasticsearch.helpers';
import {
  createMockSearchResponse,
  createMockOrder,
} from '../test/test.helpers';
import { Logger } from '@nestjs/common';

jest.mock('./elasticsearch.helpers', () => ({
  extractOrdersFromResponse: jest.fn(),
  extractTotalFromResponse: jest.fn(),
}));

describe('Search Helpers', () => {
  let elasticsearchService: ElasticsearchService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        {
          provide: ElasticsearchService,
          useValue: {
            search: jest.fn(),
          },
        },
      ],
    }).compile();

    elasticsearchService =
      moduleRef.get<ElasticsearchService>(ElasticsearchService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeSearch', () => {
    it('should return search results with pagination info', async () => {
      const searchRequest = { index: 'orders' };
      const page = 2;
      const limit = 10;
      const mockOrders = [createMockOrder(), createMockOrder()];
      const total = 25;

      const mockResponse = createMockSearchResponse(mockOrders, total);
      elasticsearchService.search = jest.fn().mockResolvedValue(mockResponse);

      (
        elasticsearchHelpers.extractOrdersFromResponse as jest.Mock
      ).mockReturnValue(mockOrders);
      (
        elasticsearchHelpers.extractTotalFromResponse as jest.Mock
      ).mockReturnValue(total);

      // Act
      const result = await executeSearch(
        elasticsearchService,
        searchRequest,
        page,
        limit,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.items).toEqual(mockOrders);
      expect(result.total).toBe(total);
      expect(result.page).toBe(page);
      expect(result.limit).toBe(limit);
      expect(result.totalPages).toBe(3);
    });

    it('should use default pagination values when not provided', async () => {
      const searchRequest = { index: 'orders' };
      const mockOrders = [createMockOrder()];
      const total = 5;

      const mockResponse = createMockSearchResponse(mockOrders, total);
      elasticsearchService.search = jest.fn().mockResolvedValue(mockResponse);

      (
        elasticsearchHelpers.extractOrdersFromResponse as jest.Mock
      ).mockReturnValue(mockOrders);
      (
        elasticsearchHelpers.extractTotalFromResponse as jest.Mock
      ).mockReturnValue(total);

      const result = await executeSearch(elasticsearchService, searchRequest);

      expect(result).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should throw SearchServiceUnavailableException on 503 status code', async () => {
      const searchRequest = { index: 'orders' };
      const error = new Error('Service unavailable');
      error['meta'] = { statusCode: 503 };

      elasticsearchService.search = jest.fn().mockRejectedValue(error);

      await expect(
        executeSearch(elasticsearchService, searchRequest),
      ).rejects.toThrow(SearchServiceUnavailableException);
    });

    it('should throw SearchServiceUnavailableException on ConnectionError', async () => {
      const searchRequest = { index: 'orders' };
      const error = new Error('Connection error');
      error['name'] = 'ConnectionError';

      elasticsearchService.search = jest.fn().mockRejectedValue(error);

      await expect(
        executeSearch(elasticsearchService, searchRequest),
      ).rejects.toThrow(SearchServiceUnavailableException);
    });

    it('should throw SearchExecutionException on other errors', async () => {
      const searchRequest = { index: 'orders' };
      const error = new Error('Generic error');

      elasticsearchService.search = jest.fn().mockRejectedValue(error);

      await expect(
        executeSearch(elasticsearchService, searchRequest),
      ).rejects.toThrow(SearchExecutionException);
    });
  });
});
