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

  beforeEach(async () => {
    const mockRepository = {
      save: jest
        .fn()
        .mockImplementation((entity) => Promise.resolve({ id: 1, ...entity })),
      find: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('recordFailedOperation', () => {
    it('should record INDEX operation failure', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174000';
      const errorMessage = 'Test error';

      await service.recordFailedOperation('index', orderUuid, errorMessage);

      expect(reconciliationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderUuid,
          operationType: ReconciliationOperationType.INDEX,
          status: ReconciliationStatus.PENDING,
          errorMessage,
        }),
      );
    });

    it('should record UPDATE operation failure', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174001';

      await service.recordFailedOperation('update', orderUuid);

      expect(reconciliationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderUuid,
          operationType: ReconciliationOperationType.UPDATE,
          status: ReconciliationStatus.PENDING,
        }),
      );
    });

    it('should record DELETE operation failure', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174002';

      await service.recordFailedOperation('delete', orderUuid);

      expect(reconciliationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderUuid,
          operationType: ReconciliationOperationType.DELETE,
          status: ReconciliationStatus.PENDING,
        }),
      );
    });

    it('should default to INDEX when receiving an unrecognized operation type', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174003';

      await service.recordFailedOperation('unknown_operation', orderUuid);

      expect(reconciliationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderUuid,
          operationType: ReconciliationOperationType.INDEX,
          status: ReconciliationStatus.PENDING,
        }),
      );
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database error');
      jest
        .spyOn(reconciliationRepository, 'save')
        .mockRejectedValueOnce(dbError);

      await service.recordFailedOperation('index', 'some-uuid');

      expect(reconciliationRepository.save).toHaveBeenCalled();
    });

    it('should use default empty error message when none is provided', async () => {
      const orderUuid = '123e4567-e89b-12d3-a456-426614174004';

      await service.recordFailedOperation('update', orderUuid);

      expect(reconciliationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderUuid,
          operationType: ReconciliationOperationType.UPDATE,
          status: ReconciliationStatus.PENDING,
          errorMessage: '',
        }),
      );
    });
  });

  describe('processFailedOperations', () => {
    it('should execute without errors', async () => {
      await service.processFailedOperations();

      expect(true).toBe(true);
    });
  });
});
