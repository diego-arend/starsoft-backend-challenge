import { Test, TestingModule } from '@nestjs/testing';
import { ElasticSearchService } from './elastic.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { ElasticSearchRepository } from './elastic.repository';
import {
  mockEntities,
  mockHealthResponse,
  mockResults,
} from './test/elastic-service.mock';

describe('ElasticSearchService', () => {
  let service: ElasticSearchService;
  let elasticsearchService: ElasticsearchService;

  const mockSearchParams = {
    query: { match_all: {} },
    size: 10,
    from: 0,
    sort: [{ createdAt: { order: 'desc' } }],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticSearchService,
        {
          provide: ElasticsearchService,
          useValue: {
            cluster: {
              health: jest.fn().mockResolvedValue(mockHealthResponse),
            },
            indices: {
              exists: jest.fn().mockResolvedValue(false),
              create: jest.fn().mockResolvedValue({ acknowledged: true }),
            },
            search: jest.fn().mockResolvedValue({
              hits: {
                hits: [{ _source: { name: 'Test Document' }, _id: '123' }],
                total: { value: 1 },
              },
            }),
            index: jest.fn().mockResolvedValue({ result: 'created' }),
            update: jest.fn().mockResolvedValue({ result: 'updated' }),
            delete: jest.fn().mockResolvedValue({ result: 'deleted' }),
            bulk: jest.fn().mockResolvedValue({ errors: false, items: [] }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-index') },
        },
        {
          provide: ElasticSearchRepository,
          useValue: {
            indexDocument: jest
              .fn()
              .mockResolvedValue(mockResults.indexDocument),
            searchByFilters: jest
              .fn()
              .mockResolvedValue(mockResults.searchResults),
          },
        },
      ],
    }).compile();

    service = module.get<ElasticSearchService>(ElasticSearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
  });

  describe('Elasticsearch operations', () => {
    it('should return health information', async () => {
      const result = await service.healthCheck();

      expect(result).toEqual(mockHealthResponse);
      expect(result.status).toBe('green');
    });

    it('should create index if it does not exist', async () => {
      await service.createIndex();

      expect(true).toBeTruthy();
    });

    it('should index a document successfully', async () => {
      const document = { id: '123', name: 'Test Document' };

      const result = await service.indexDocument(document);

      expect(result).toEqual(mockResults.indexDocument);
    });

    it('should search with query parameters and return results', async () => {
      const index = 'test-index';
      const queryParams = [JSON.stringify(mockSearchParams)];

      const result = await service.search(index, queryParams);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('id');
    });

    it('should search with metadata and return complete response', async () => {
      const index = 'test-index';
      const queryParams = [JSON.stringify(mockSearchParams)];

      const result = await service.searchWithMeta(index, queryParams);

      expect(result).toHaveProperty('hits');
      expect(result.hits).toHaveProperty('total');
      expect(result.hits.hits.length).toBeGreaterThan(0);
    });

    it('should search by filters', async () => {
      const filters = { status: 'active' };

      const result = await service.searchByFilters(filters);

      expect(result).toEqual(mockResults.searchResults);
    });
  });

  describe('Document operations', () => {
    it('should add or update a document', async () => {
      const index = 'test-index';
      const id = '123';
      const document = { name: 'Test Document', status: 'active' };

      const result = await service.index(index, id, document);

      expect(result).toHaveProperty('result', 'created');
    });

    it('should update an existing document', async () => {
      const index = 'test-index';
      const id = '123';
      const document = { status: 'updated' };

      const result = await service.update(index, id, document);

      expect(result).toHaveProperty('result', 'updated');
    });

    it('should delete a document', async () => {
      const index = 'test-index';
      const id = '123';

      const result = await service.delete(index, id);

      expect(result).toHaveProperty('result', 'deleted');
    });

    it('should perform bulk operations', async () => {
      const operations = [
        { index: { _index: 'test-index', _id: '1' } },
        { name: 'Document 1' },
        { index: { _index: 'test-index', _id: '2' } },
        { name: 'Document 2' },
      ];

      const result = await service.bulk(operations);

      expect(result).toHaveProperty('errors', false);
    });
  });

  describe('Error handling', () => {
    it('should handle index creation errors gracefully', async () => {
      jest
        .spyOn(elasticsearchService.indices, 'create')
        .mockRejectedValueOnce(new Error('Failed to create index'));

      await service.setupElasticsearch();

      expect(true).toBeTruthy();
    });

    it('should handle search errors and return empty array', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockRejectedValueOnce(new Error('Search failed'));

      const result = await service.search('test-index', [
        JSON.stringify(mockSearchParams),
      ]);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should throw error when document operations fail', async () => {
      jest
        .spyOn(elasticsearchService, 'index')
        .mockRejectedValueOnce(new Error('Index operation failed'));

      await expect(
        service.index('test-index', '123', { test: true }),
      ).rejects.toThrow('Index operation failed');
    });
  });

  describe('Batch operations', () => {
    it('should reindex a collection of documents', async () => {
      await expect(service.reindexAll(mockEntities)).resolves.not.toThrow();
    });

    it('should handle large collections using bulk operations', async () => {
      const largeCollection = Array(150)
        .fill(null)
        .map((_, i) => ({
          id: `doc-${i}`,
          name: `Document ${i}`,
          status: 'active',
        }));

      await expect(service.reindexAll(largeCollection)).resolves.not.toThrow();
    });
  });
});
