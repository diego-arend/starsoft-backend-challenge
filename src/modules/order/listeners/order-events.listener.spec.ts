import { Test, TestingModule } from '@nestjs/testing';
import { OrderEventsListener } from './order-events.listener';
import { OrderElasticsearchService } from '../services/order-elasticsearch.service';
import { OrderReconciliationService } from '../services/order-reconciliation.service';
import { createSampleOrder } from '../test/test.providers';
import { Logger } from '@nestjs/common';

describe('OrderEventsListener', () => {
  let listener: OrderEventsListener;
  let elasticsearchService: jest.Mocked<OrderElasticsearchService>;
  let reconciliationService: jest.Mocked<OrderReconciliationService>;
  let sampleOrder: ReturnType<typeof createSampleOrder>;

  beforeEach(async () => {
    sampleOrder = createSampleOrder();

    const elasticsearchServiceMock = {
      indexOrder: jest.fn().mockResolvedValue(true),
      updateOrder: jest.fn().mockResolvedValue(true),
    };

    const reconciliationServiceMock = {
      recordFailedOperation: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderEventsListener,
        {
          provide: OrderElasticsearchService,
          useValue: elasticsearchServiceMock,
        },
        {
          provide: OrderReconciliationService,
          useValue: reconciliationServiceMock,
        },
      ],
    }).compile();

    listener = module.get<OrderEventsListener>(OrderEventsListener);
    elasticsearchService = module.get(
      OrderElasticsearchService,
    ) as jest.Mocked<OrderElasticsearchService>;
    reconciliationService = module.get(
      OrderReconciliationService,
    ) as jest.Mocked<OrderReconciliationService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleOrderCreatedEvent', () => {
    it('should successfully index a created order in Elasticsearch', async () => {
      const eventPayload = {
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };

      await listener.handleOrderCreatedEvent(eventPayload);

      expect(elasticsearchService.indexOrder).toHaveBeenCalledWith(sampleOrder);

      expect(
        reconciliationService.recordFailedOperation,
      ).not.toHaveBeenCalled();
    });

    it('should record operation for reconciliation when indexing fails', async () => {
      const eventPayload = {
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };
      const errorMessage = 'Elasticsearch connection error';
      elasticsearchService.indexOrder.mockRejectedValueOnce(
        new Error(errorMessage),
      );

      await listener.handleOrderCreatedEvent(eventPayload);

      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'index',
        sampleOrder.uuid,
        errorMessage,
      );
    });
  });

  describe('handleOrderUpdatedEvent', () => {
    it('should successfully update an order in Elasticsearch', async () => {
      const eventPayload = {
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };

      await listener.handleOrderUpdatedEvent(eventPayload);

      expect(elasticsearchService.updateOrder).toHaveBeenCalledWith(
        sampleOrder,
      );
      expect(
        reconciliationService.recordFailedOperation,
      ).not.toHaveBeenCalled();
    });

    it('should record operation for reconciliation when update fails', async () => {
      const eventPayload = {
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };
      const errorMessage = 'Elasticsearch update error';
      elasticsearchService.updateOrder.mockRejectedValueOnce(
        new Error(errorMessage),
      );

      await listener.handleOrderUpdatedEvent(eventPayload);

      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'update',
        sampleOrder.uuid,
        errorMessage,
      );
    });
  });

  describe('handleOrderCanceledEvent', () => {
    it('should successfully update a canceled order in Elasticsearch', async () => {
      const eventPayload = {
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };

      await listener.handleOrderCanceledEvent(eventPayload);

      expect(elasticsearchService.updateOrder).toHaveBeenCalledWith(
        sampleOrder,
      );
      expect(
        reconciliationService.recordFailedOperation,
      ).not.toHaveBeenCalled();
    });

    it('should record operation for reconciliation when cancellation update fails', async () => {
      const eventPayload = {
        orderUuid: sampleOrder.uuid,
        payload: sampleOrder,
      };
      const errorMessage = 'Elasticsearch cancel update error';
      elasticsearchService.updateOrder.mockRejectedValueOnce(
        new Error(errorMessage),
      );

      await listener.handleOrderCanceledEvent(eventPayload);

      expect(reconciliationService.recordFailedOperation).toHaveBeenCalledWith(
        'update',
        sampleOrder.uuid,
        errorMessage,
      );
    });
  });
});
