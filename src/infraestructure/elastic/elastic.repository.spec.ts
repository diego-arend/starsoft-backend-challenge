import { Test, TestingModule } from '@nestjs/testing';
import { ElasticSearchRepository } from './elastic.repository';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { Logger } from '@nestjs/common';
import {
  mockProducts,
  mockSearchResponses,
  mockResponses,
} from './test/elastic.mock';

describe('ElasticSearchRepository', () => {
  let repository: ElasticSearchRepository;
  let elasticsearchService: ElasticsearchService;
  const indexName = 'test-products';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticSearchRepository,
        {
          provide: ElasticsearchService,
          useValue: {
            index: jest.fn(),
            search: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            bulk: jest.fn(),
          },
        },
        {
          provide: 'ELASTICSEARCH_INDEX_NAME',
          useValue: indexName,
        },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    repository = module.get<ElasticSearchRepository>(ElasticSearchRepository);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('indexDocument', () => {
    it('should successfully index a document', async () => {
      const document = mockProducts[0];
      jest
        .spyOn(elasticsearchService, 'index')
        .mockResolvedValue(mockResponses.index);

      const result = await repository.indexDocument(document);

      expect(result).toEqual(mockResponses.index);
      expect(result.result).toBe('created');
      expect(elasticsearchService.index).toHaveBeenCalledWith({
        index: indexName,
        id: document.id,
        document,
      });
    });

    it('should propagate errors when indexing a document', async () => {
      const document = mockProducts[0];
      const errorMessage = 'Failed to index document';
      jest
        .spyOn(elasticsearchService, 'index')
        .mockRejectedValue(new Error(errorMessage));

      await expect(repository.indexDocument(document)).rejects.toThrow(
        errorMessage,
      );
    });
  });

  describe('search', () => {
    it('should perform text search across multiple fields', async () => {
      const query = 'smartphone';
      const fields = ['name', 'description'];
      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(mockSearchResponses.basicSearch);

      const results = await repository.search(query, fields);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(mockProducts[0].id);
      expect(elasticsearchService.search).toHaveBeenCalledWith({
        index: indexName,
        query: {
          multi_match: {
            query,
            fields,
          },
        },
      });
    });
  });

  describe('remove', () => {
    it('should successfully remove a document', async () => {
      const id = mockProducts[0].id;
      jest
        .spyOn(elasticsearchService, 'delete')
        .mockResolvedValue(mockResponses.delete);

      const result = await repository.remove(id);

      expect(result).toEqual(mockResponses.delete);
      expect(result.result).toBe('deleted');
      expect(elasticsearchService.delete).toHaveBeenCalledWith({
        index: indexName,
        id,
      });
    });
  });

  describe('bulkIndex', () => {
    it('should index multiple documents in bulk', async () => {
      const documents = [mockProducts[0], mockProducts[1]];
      jest
        .spyOn(elasticsearchService, 'bulk')
        .mockResolvedValue(mockResponses.bulk);

      const result = await repository.bulkIndex(documents);

      expect(result).toEqual(mockResponses.bulk);
      expect(result.errors).toBe(false);
      expect(elasticsearchService.bulk).toHaveBeenCalledWith({
        operations: [
          { index: { _index: indexName, _id: documents[0].id } },
          documents[0],
          { index: { _index: indexName, _id: documents[1].id } },
          documents[1],
        ],
      });
    });

    it('should propagate errors during bulk indexing', async () => {
      const documents = [mockProducts[0], mockProducts[1]];
      const errorMessage = 'Bulk indexing failed';
      jest
        .spyOn(elasticsearchService, 'bulk')
        .mockRejectedValue(new Error(errorMessage));

      await expect(repository.bulkIndex(documents)).rejects.toThrow(
        errorMessage,
      );
    });
  });
});
