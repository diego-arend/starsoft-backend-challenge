import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '../../../logger/logger.service';
import { OrderReconciliationService } from './order-reconciliation.service';
import { OrderReconciliation } from '../entities/order-reconciliation.entity';
import { createMockLoggerService } from '../test/test.providers';
import {
  ReconciliationOperationType,
  ReconciliationStatus,
} from '../types/reconciliation-types';

describe('OrderReconciliationService', () => {
  let service: OrderReconciliationService;
  let reconciliationRepository: Repository<OrderReconciliation>;
  let loggerService: LoggerService;

  const mockRepository = {
    save: jest
      .fn()
      .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderReconciliationService,
        {
          provide: getRepositoryToken(OrderReconciliation),
          useValue: mockRepository,
        },
        {
          provide: LoggerService,
          useValue: createMockLoggerService(),
        },
      ],
    }).compile();

    service = module.get<OrderReconciliationService>(
      OrderReconciliationService,
    );
    reconciliationRepository = module.get<Repository<OrderReconciliation>>(
      getRepositoryToken(OrderReconciliation),
    );
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordFailedOperation', () => {
    it('should save a reconciliation record with correct values', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174000';
      const operation = 'index';
      const errorMessage = 'Test error';

      await service.recordFailedOperation(operation, orderUuid, errorMessage);

      expect(reconciliationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderUuid,
          operationType: ReconciliationOperationType.INDEX,
          status: ReconciliationStatus.PENDING,
          errorMessage,
        }),
      );
      expect(loggerService.warn).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database error');
      jest
        .spyOn(reconciliationRepository, 'save')
        .mockRejectedValueOnce(dbError);

      await service.recordFailedOperation('index', 'some-uuid');

      expect(loggerService.error).toHaveBeenCalled();
    });
  });

  describe('processFailedOperations', () => {
    it('should log a message', async () => {
      await service.processFailedOperations();

      expect(loggerService.log).toHaveBeenCalled();
    });
  });
});
