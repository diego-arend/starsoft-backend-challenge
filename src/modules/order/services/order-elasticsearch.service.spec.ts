import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '../../../logger/logger.service';
import { OrderElasticsearchService } from './order-elasticsearch.service';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import {
  createMockLoggerService,
  createSampleOrder,
} from '../test/test.providers';
import { createEmptySearchResponse } from '../test/elasticsearch-test.providers';
import {
  ElasticsearchSearchException,
  ElasticsearchNotFoundException,
} from '../../../common/exceptions/elasticsearch-exceptions';
import { Logger, NotFoundException } from '@nestjs/common';

describe('OrderElasticsearchService', () => {
  let service: OrderElasticsearchService;
  let elasticsearchService: ElasticsearchService;

  const sampleOrder = createSampleOrder();
  const orderUuid = sampleOrder.uuid;
  const customerId = sampleOrder.customerId;

  beforeEach(async () => {
    const mockElasticsearchService = {
      search: jest.fn(),
      index: jest.fn().mockResolvedValue({
        result: 'created',
        _id: orderUuid,
      }),
      count: jest.fn().mockResolvedValue({ count: 10 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderElasticsearchService,
        {
          provide: ElasticsearchService,
          useValue: mockElasticsearchService,
        },
        {
          provide: LoggerService,
          useValue: createMockLoggerService(),
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderElasticsearchService>(OrderElasticsearchService);
    elasticsearchService =
      module.get<ElasticsearchService>(ElasticsearchService);
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockResponse = createEmptySearchResponse();
      mockResponse.hits.total.value = 1;
      mockResponse.hits.hits = [{ _source: sampleOrder }];

      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(mockResponse);

      const result = await service.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.data[0].uuid).toBe(sampleOrder.uuid);
      expect(result.data[0].customerId).toBe(sampleOrder.customerId);
      expect(result.data[0].status).toBe(sampleOrder.status);
    });

    it('should return empty result in case of error', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockRejectedValue(new Error('Search error'));

      const result = await service.findAll();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
    });

    it('should apply pagination parameters', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(createEmptySearchResponse());

      const paginationDto = new PaginationDto();
      paginationDto.page = 2;
      paginationDto.limit = 5;

      const result = await service.findAll(paginationDto);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(elasticsearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 5,
          size: 5,
        }),
      );
    });
  });

  describe('findOneByUuid', () => {
    it('should return a specific order by UUID', async () => {
      const mockResponse = createEmptySearchResponse();
      mockResponse.hits.total.value = 1;
      mockResponse.hits.hits = [{ _source: sampleOrder }];

      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(mockResponse);

      const result = await service.findOneByUuid(orderUuid);

      expect(result.uuid).toBe(sampleOrder.uuid);
      expect(result.customerId).toBe(sampleOrder.customerId);
      expect(result.status).toBe(sampleOrder.status);
      expect(result.total).toBe(sampleOrder.total);
    });

    it('should throw ElasticsearchNotFoundException when order is not found', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(createEmptySearchResponse());

      await expect(service.findOneByUuid('non-existent-uuid')).rejects.toThrow(
        ElasticsearchNotFoundException,
      );
    });

    it('should throw ElasticsearchSearchException in case of error', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockRejectedValue(new Error('Search error'));

      await expect(service.findOneByUuid(orderUuid)).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });
  });

  describe('findByCustomer', () => {
    it('should return customer orders', async () => {
      const mockResponse = createEmptySearchResponse();
      mockResponse.hits.total.value = 2;
      mockResponse.hits.hits = [
        { _source: { ...sampleOrder, customerId } },
        { _source: { ...sampleOrder, uuid: 'order-2', customerId } },
      ];

      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(mockResponse);

      const result = await service.findByCustomer(customerId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].customerId).toBe(customerId);
      expect(result.data[1].customerId).toBe(customerId);
      expect(result.data[1].uuid).toBe('order-2');
    });

    it('should throw NotFoundException when customer has no orders', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockResolvedValue(createEmptySearchResponse());

      await expect(
        service.findByCustomer('customer-without-orders'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ElasticsearchSearchException in case of error', async () => {
      jest
        .spyOn(elasticsearchService, 'search')
        .mockRejectedValue(new Error('Connection error'));

      await expect(service.findByCustomer(customerId)).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });
  });

  describe('indexOrder', () => {
    it('should index an order successfully', async () => {
      const result = await service.indexOrder(sampleOrder);

      expect(result).toBe(true);
      expect(elasticsearchService.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.any(String),
          id: orderUuid,
          document: expect.anything(),
        }),
      );
    });

    it('should throw exception in case of indexing error', async () => {
      jest
        .spyOn(elasticsearchService, 'index')
        .mockRejectedValue(new Error('Indexing error'));

      await expect(service.indexOrder(sampleOrder)).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });
  });

  describe('updateOrder', () => {
    it('should update an order successfully', async () => {
      const result = await service.updateOrder(sampleOrder);

      expect(result).toBe(true);
      expect(elasticsearchService.index).toHaveBeenCalledWith(
        expect.objectContaining({
          index: expect.any(String),
          id: orderUuid,
          document: expect.anything(),
        }),
      );
    });

    it('should throw exception in case of update error', async () => {
      jest
        .spyOn(elasticsearchService, 'index')
        .mockRejectedValue(new Error('Update error'));

      await expect(service.updateOrder(sampleOrder)).rejects.toThrow(
        ElasticsearchSearchException,
      );
    });
  });

  describe('getTotalDocumentCount', () => {
    it('should return the total document count', async () => {
      const result = await service.getTotalDocumentCount();

      expect(result).toBe(10);
    });

    it('should return 0 in case of error', async () => {
      jest
        .spyOn(elasticsearchService, 'count')
        .mockRejectedValue(new Error('Count error'));

      const result = await service.getTotalDocumentCount();

      expect(result).toBe(0);
    });
  });
});
