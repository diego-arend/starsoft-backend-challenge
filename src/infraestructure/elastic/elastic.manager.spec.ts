import { Test, TestingModule } from '@nestjs/testing';
import { ElasticSearchManager } from './elastic.manager';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { ClusterHealthHealthResponseBody } from '@elastic/elasticsearch/lib/api/types';

const mockClusterHealth: ClusterHealthHealthResponseBody = {
  cluster_name: 'elasticsearch',
  status: 'green',
  timed_out: false,
  number_of_nodes: 1,
  number_of_data_nodes: 1,
  active_primary_shards: 5,
  active_shards: 10,
  relocating_shards: 0,
  initializing_shards: 0,
  unassigned_shards: 0,
  delayed_unassigned_shards: 0,
  unassigned_primary_shards: 0,
  number_of_pending_tasks: 0,
  number_of_in_flight_fetch: 0,
  task_max_waiting_in_queue_millis: 0,
  active_shards_percent_as_number: 100,
};

const mockIndexCreation = {
  acknowledged: true,
  shards_acknowledged: true,
  index: 'test-index',
};

describe('ElasticSearchManager', () => {
  let manager: ElasticSearchManager;
  let elasticsearchService: ElasticsearchService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticSearchManager,
        {
          provide: ElasticsearchService,
          useValue: {
            indices: {
              exists: jest.fn(),
              create: jest.fn(),
            },
            cluster: {
              health: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-index'),
          },
        },
      ],
    }).compile();

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    manager = module.get<ElasticSearchManager>(ElasticSearchManager);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use the index from configuration if defined', () => {
      jest.spyOn(configService, 'get').mockReturnValue('custom-index');

      const customManager = new ElasticSearchManager(
        elasticsearchService,
        configService,
      );

      expect(customManager.getIndexName()).toBe('custom-index');
      expect(configService.get).toHaveBeenCalledWith('ELASTICSEARCH_INDEX');
    });

    it('should use the default value "products" if index is not defined', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);

      const defaultManager = new ElasticSearchManager(
        elasticsearchService,
        configService,
      );

      expect(defaultManager.getIndexName()).toBe('products');
    });
  });

  describe('createIndex', () => {
    it('should create the index if it does not exist', async () => {
      jest
        .spyOn(elasticsearchService.indices, 'exists')
        .mockResolvedValue(false);
      jest
        .spyOn(elasticsearchService.indices, 'create')
        .mockResolvedValue(mockIndexCreation);

      await manager.createIndex();

      expect(elasticsearchService.indices.exists).toHaveBeenCalledWith({
        index: 'test-index',
      });

      expect(elasticsearchService.indices.create).toHaveBeenCalledWith({
        index: 'test-index',
        mappings: {
          properties: {
            id: { type: 'keyword' },
            name: { type: 'text' },
            description: { type: 'text' },
            price: { type: 'float' },
            category: { type: 'keyword' },
            createdAt: { type: 'date' },
          },
        },
      });
    });

    it('should not create the index if it already exists', async () => {
      jest
        .spyOn(elasticsearchService.indices, 'exists')
        .mockResolvedValue(true);

      await manager.createIndex();

      expect(elasticsearchService.indices.exists).toHaveBeenCalledWith({
        index: 'test-index',
      });
      expect(elasticsearchService.indices.create).not.toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return cluster health information when healthy', async () => {
      jest
        .spyOn(elasticsearchService.cluster, 'health')
        .mockResolvedValue(mockClusterHealth);

      const result = await manager.healthCheck();

      expect(result).toEqual(mockClusterHealth);
      expect(result.status).toBe('green');
    });

    it('should throw an error when health check fails', async () => {
      const mockError = new Error('Connection failure');
      jest
        .spyOn(elasticsearchService.cluster, 'health')
        .mockRejectedValue(mockError);

      await expect(manager.healthCheck()).rejects.toThrow('Connection failure');
    });
  });

  describe('getIndexName', () => {
    it('should return the configured index name', () => {
      const expectedIndexName = 'test-index';
      jest.spyOn(configService, 'get').mockReturnValue(expectedIndexName);
      const indexManager = new ElasticSearchManager(
        elasticsearchService,
        configService,
      );

      const result = indexManager.getIndexName();

      expect(result).toBe(expectedIndexName);
    });
  });
});
