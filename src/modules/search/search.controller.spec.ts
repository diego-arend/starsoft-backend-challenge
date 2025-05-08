import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { mockOrders, mockOrder } from '../../test/mocks/order.mock';
import { OrderStatus } from '../order/entities/order.entity';
import { NotFoundException } from '@nestjs/common';

describe('SearchController', () => {
  let controller: SearchController;
  let service: SearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        SearchService,
        {
          provide: ElasticsearchService,
          useFactory: () => ({
            search: jest.fn().mockImplementation(() => ({
              hits: {
                hits: [],
                total: { value: 0, relation: 'eq' },
              },
            })),
            indices: {
              exists: jest.fn().mockResolvedValue(true),
              create: jest.fn().mockResolvedValue({}),
            },
            index: jest.fn().mockResolvedValue({
              _index: 'orders',
              _id: '123',
              _version: 1,
              result: 'created',
            }),
            update: jest.fn().mockResolvedValue({}),
            delete: jest.fn().mockResolvedValue({}),
          }),
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findByUuid', () => {
    it('should return an order when found', async () => {
      const uuid = mockOrder.uuid;
      // Usar type assertion para evitar erro de tipo
      jest.spyOn(service, 'findByUuid').mockResolvedValue(mockOrder as any);

      const result = await controller.findByUuid(uuid);
      expect(result).toEqual(mockOrder);
      expect(service.findByUuid).toHaveBeenCalledWith(uuid);
    });

    it('should propagate NotFoundException when order not found', async () => {
      const uuid = 'non-existent-uuid';
      jest
        .spyOn(service, 'findByUuid')
        .mockRejectedValue(
          new NotFoundException(`Order with UUID ${uuid} not found`),
        );

      await expect(controller.findByUuid(uuid)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.findByUuid).toHaveBeenCalledWith(uuid);
    });
  });

  describe('findByStatus', () => {
    it('should return orders with specified status', async () => {
      const status = OrderStatus.DELIVERED;
      const page = 1;
      const limit = 10;
      const expectedResult = {
        items: [mockOrders[0] as any], // Usando type assertion
        total: 1,
        page,
        limit,
        totalPages: 1,
      };

      jest
        .spyOn(service, 'findByStatus')
        .mockResolvedValue(expectedResult as any);

      const result = await controller.findByStatus(status, page, limit);
      expect(result).toEqual(expectedResult);
      expect(service.findByStatus).toHaveBeenCalledWith(status, page, limit);
    });
  });

  describe('findByDateRange', () => {
    it('should return orders within date range', async () => {
      const from = '2023-01-01T00:00:00Z';
      const to = '2023-02-01T00:00:00Z';
      const page = 1;
      const limit = 10;
      const expectedResult = {
        items: [mockOrders[0] as any], // Usando type assertion
        total: 1,
        page,
        limit,
        totalPages: 1,
      };

      jest
        .spyOn(service, 'findByDateRange')
        .mockResolvedValue(expectedResult as any);

      const result = await controller.findByDateRange(from, to, page, limit);
      expect(result).toEqual(expectedResult);
      expect(service.findByDateRange).toHaveBeenCalledWith(
        { from, to },
        page,
        limit,
      );
    });
  });

  describe('findByProductId', () => {
    it('should return orders containing the specified product', async () => {
      const productId = mockOrders[0].items[0].productId;
      const page = 1;
      const limit = 10;
      const expectedResult = {
        items: [mockOrders[0] as any], // Usando type assertion
        total: 1,
        page,
        limit,
        totalPages: 1,
      };

      jest
        .spyOn(service, 'findByProductId')
        .mockResolvedValue(expectedResult as any);

      const result = await controller.findByProductId(productId, page, limit);
      expect(result).toEqual(expectedResult);
      expect(service.findByProductId).toHaveBeenCalledWith(
        productId,
        page,
        limit,
      );
    });
  });

  describe('findByProductName', () => {
    it('should return orders containing products with matching name', async () => {
      const productName = 'Smartphone';
      const page = 1;
      const limit = 10;
      const expectedResult = {
        items: [mockOrders[0] as any], // Usando type assertion
        total: 1,
        page,
        limit,
        totalPages: 1,
      };

      jest
        .spyOn(service, 'findByProductName')
        .mockResolvedValue(expectedResult as any);

      const result = await controller.findByProductName(
        productName,
        page,
        limit,
      );
      expect(result).toEqual(expectedResult);
      expect(service.findByProductName).toHaveBeenCalledWith(
        productName,
        page,
        limit,
      );
    });
  });

  describe('findByCustomerId', () => {
    it('should return orders for specified customer', async () => {
      const customerId = mockOrders[0].customerId;
      const page = 1;
      const limit = 10;
      const expectedResult = {
        items: [mockOrders[0] as any, mockOrders[1] as any], // Usando type assertion
        total: 2,
        page,
        limit,
        totalPages: 1,
      };

      jest
        .spyOn(service, 'findByCustomerId')
        .mockResolvedValue(expectedResult as any);

      const result = await controller.findByCustomerId(customerId, page, limit);
      expect(result).toEqual(expectedResult);
      expect(service.findByCustomerId).toHaveBeenCalledWith(
        customerId,
        page,
        limit,
      );
    });
  });
});
