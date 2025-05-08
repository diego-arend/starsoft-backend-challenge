import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { LoggerService } from '../../logger/logger.service';
import { OrderEventType } from './types/order-events.types';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { emitOrderEvent } from './helpers/event.helpers';
import { logOrderError } from './helpers/logger.helpers';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';

/**
 * Main service that orchestrates order operations between data sources
 */
@Injectable()
export class OrderService {
  constructor(
    private readonly orderPostgresService: OrderPostgresService,
    private readonly orderElasticsearchService: OrderElasticsearchService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Creates a new order with items
   */
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      const order = await this.orderPostgresService.create(createOrderDto);

      emitOrderEvent(
        this.eventEmitter,
        OrderEventType.CREATED,
        order,
        this.logger,
      );

      return order;
    } catch (error) {
      logOrderError(this.logger, 'create', error);
      throw new BadRequestException('Failed to create order: ' + error.message);
    }
  }

  /**
   * Finds all orders using Elasticsearch with database fallback, with pagination
   */
  async findAll(
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    try {
      return await this.orderElasticsearchService.findAll(paginationDto);
    } catch (error) {
      this.logger.warn(
        'Falling back to database for orders retrieval',
        'OrderService',
      );
      return this.orderPostgresService.findAll(paginationDto);
    }
  }

  /**
   * Finds a specific order by internal ID
   */
  async findOne(id: number): Promise<Order> {
    try {
      const pgOrder = await this.orderPostgresService.findOne(id);

      try {
        const esOrder = await this.orderElasticsearchService.findOneByUuid(
          pgOrder.uuid,
        );
        if (esOrder) {
          return esOrder;
        }
      } catch (error) {
        this.logger.debug(
          `Elasticsearch query failed for UUID ${pgOrder.uuid}, using PostgreSQL result: ${error.message}`,
          'OrderService',
        );
      }

      return pgOrder;
    } catch (error) {
      logOrderError(this.logger, 'findOne', error);
      throw error;
    }
  }

  /**
   * Finds a specific order by public UUID
   */
  async findOneByUuid(uuid: string): Promise<Order> {
    try {
      const esOrder = await this.orderElasticsearchService.findOneByUuid(uuid);
      if (esOrder) {
        return esOrder;
      }
    } catch (error) {
      this.logger.debug(
        `Elasticsearch query failed, falling back to database: ${error.message}`,
        'OrderService',
      );
    }

    return this.orderPostgresService.findOneByUuid(uuid);
  }

  /**
   * Updates an existing order
   */
  async update(uuid: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    try {
      const updatedOrder = await this.orderPostgresService.update(
        uuid,
        updateOrderDto,
      );

      emitOrderEvent(
        this.eventEmitter,
        OrderEventType.UPDATED,
        updatedOrder,
        this.logger,
      );

      return updatedOrder;
    } catch (error) {
      logOrderError(this.logger, 'update', error);
      throw new BadRequestException('Failed to update order: ' + error.message);
    }
  }

  /**
   * Cancels an order by changing its status to CANCELED
   */
  async cancel(uuid: string): Promise<Order> {
    try {
      const canceledOrder = await this.orderPostgresService.cancel(uuid);

      emitOrderEvent(
        this.eventEmitter,
        OrderEventType.CANCELED,
        canceledOrder,
        this.logger,
      );

      return canceledOrder;
    } catch (error) {
      logOrderError(this.logger, 'cancel', error);
      throw new BadRequestException('Failed to cancel order: ' + error.message);
    }
  }

  /**
   * Find orders by customer ID with pagination
   */
  async findByCustomer(
    customerId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    try {
      return await this.orderElasticsearchService.findByCustomer(
        customerId,
        paginationDto,
      );
    } catch (error) {
      this.logger.warn(
        `Falling back to database for customer orders retrieval: ${error.message}`,
        'OrderService',
      );

      return this.orderPostgresService.findByCustomer(
        customerId,
        paginationDto,
      );
    }
  }
}
