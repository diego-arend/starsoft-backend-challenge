import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, firstValueFrom } from 'rxjs';
import { ElasticSearchService } from '../infraestructure/elastic/elastic.service';
import { ElasticsearchInterceptor } from './elastic.interceptor';

// Simplified test data
const mockProduct = {
  id: '1',
  name: 'Smartphone XYZ',
  price: 999.99,
  category: 'Electronics',
};

const mockNonProduct = {
  id: '3',
  title: 'Something else',
  description: 'Not a product',
};

describe('ElasticsearchInterceptor', () => {
  let interceptor: ElasticsearchInterceptor;
  let elasticsearchService: ElasticSearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticsearchInterceptor,
        {
          provide: ElasticSearchService,
          useValue: {
            indexDocument: jest.fn().mockResolvedValue({ result: 'created' }),
          },
        },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    interceptor = module.get<ElasticsearchInterceptor>(
      ElasticsearchInterceptor,
    );
    elasticsearchService =
      module.get<ElasticSearchService>(ElasticSearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Data processing', () => {
    // Helper to simulate HTTP request
    const createMockContext = (method: string) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ method }),
        }),
      }) as any;

    // Helper to simulate the next handler
    const createNext = (data: any) => ({ handle: () => of(data) });

    it('should return data without modifications for GET', async () => {
      const result = await firstValueFrom(
        interceptor.intercept(
          createMockContext('GET'),
          createNext(mockProduct),
        ),
      );

      expect(result).toEqual(mockProduct);
    });

    it('should return data without modifications for POST', async () => {
      const result = await firstValueFrom(
        interceptor.intercept(
          createMockContext('POST'),
          createNext(mockProduct),
        ),
      );

      expect(result).toEqual(mockProduct);
    });

    it('should return null data without errors', async () => {
      const result = await firstValueFrom(
        interceptor.intercept(createMockContext('POST'), createNext(null)),
      );

      expect(result).toBeNull();
    });

    it('should continue working if indexing fails', async () => {
      // Make indexing fail
      jest
        .spyOn(elasticsearchService, 'indexDocument')
        .mockRejectedValueOnce(new Error('Indexing failure'));

      const result = await firstValueFrom(
        interceptor.intercept(
          createMockContext('POST'),
          createNext(mockProduct),
        ),
      );

      // The result should not be affected by indexing errors
      expect(result).toEqual(mockProduct);
    });
  });

  // Tests for observable indexing behavior
  describe('Indexing behavior', () => {
    it('should index products in POST operations', async () => {
      const indexSpy = jest.spyOn(elasticsearchService, 'indexDocument');

      await firstValueFrom(
        interceptor.intercept(
          {
            switchToHttp: () => ({ getRequest: () => ({ method: 'POST' }) }),
          } as any,
          { handle: () => of(mockProduct) },
        ),
      );

      // We check the indexing result, not just the call
      expect(indexSpy.mock.calls[0]?.[0]).toEqual(mockProduct);
    });

    it('should not try to index data that are not products', async () => {
      const indexSpy = jest.spyOn(elasticsearchService, 'indexDocument');

      await firstValueFrom(
        interceptor.intercept(
          {
            switchToHttp: () => ({ getRequest: () => ({ method: 'POST' }) }),
          } as any,
          { handle: () => of(mockNonProduct) },
        ),
      );

      expect(indexSpy.mock.calls.length).toBe(0);
    });
  });
});
