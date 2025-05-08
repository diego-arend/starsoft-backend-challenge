import { Test, TestingModule } from '@nestjs/testing';
import { ElasticSearchService } from './elastic.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { ElasticSearchRepository } from './elastic.repository';
import { Logger } from '@nestjs/common';
import {
  mockEntities,
  mockHealthResponse,
  mockResults,
} from './test/elastic-service.mock';

describe('ElasticSearchService', () => {
  let service: ElasticSearchService;
  let elasticsearchService: ElasticsearchService;
  let elasticRepository: ElasticSearchRepository;

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
            indices: { exists: jest.fn(), create: jest.fn() },
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
            search: jest.fn().mockResolvedValue(mockResults.searchResults),
            searchByFilters: jest
              .fn()
              .mockResolvedValue(mockResults.searchResults),
            update: jest.fn().mockResolvedValue(mockResults.updateResult),
            remove: jest.fn().mockResolvedValue(mockResults.deleteResult),
            bulkIndex: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    service = module.get<ElasticSearchService>(ElasticSearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
    elasticRepository = module.get<ElasticSearchRepository>(
      ElasticSearchRepository,
    );
  });

  describe('Basic operations', () => {
    it('should check cluster health without errors', async () => {
      const health = await service.healthCheck();
      expect(health).toEqual(mockHealthResponse);
      expect(health.status).toBe('green');
    });

    it('should index a document correctly', async () => {
      const document = mockEntities[0];
      const result = await service.indexDocument(document);
      expect(result).toEqual(mockResults.indexDocument);
    });

    it('should search documents by text', async () => {
      const result = await service.search('test');
      expect(result).toEqual(mockResults.searchResults);
    });

    it('should search documents by filters', async () => {
      const result = await service.searchByFilters({ status: 'completed' });
      expect(result).toEqual(mockResults.searchResults);
    });

    it('should update a document', async () => {
      const result = await service.update('001', { status: 'updated' });
      expect(result).toEqual(mockResults.updateResult);
    });

    it('should remove a document', async () => {
      const result = await service.remove('001');
      expect(result).toEqual(mockResults.deleteResult);
    });
  });

  describe('Error handling', () => {
    it('should propagate error in health check', async () => {
      jest
        .spyOn(elasticsearchService.cluster, 'health')
        .mockRejectedValueOnce(new Error('Connection error'));

      await expect(service.healthCheck()).rejects.toThrow('Connection error');
    });

    it('should propagate error in indexing', async () => {
      jest
        .spyOn(elasticRepository, 'indexDocument')
        .mockRejectedValueOnce(new Error('Index error'));

      await expect(service.indexDocument(mockEntities[0])).rejects.toThrow(
        'Index error',
      );
    });
  });

  describe('Reindexing', () => {
    it('should reindex documents without errors', async () => {
      await expect(service.reindexAll(mockEntities)).resolves.not.toThrow();
    });
  });
});
