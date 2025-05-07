import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order } from './entities/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { LoggerService } from '../../logger/logger.service';
import { OrderEventType } from './events/order-events.types';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import { OrderPostgresService } from './services/order-postgres.service';
import { emitOrderEvent } from './helpers/event.helpers';
import { logOrderError } from './helpers/logger.helpers';

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
   *
   * @param createOrderDto Order data with items (all monetary values in cents)
   * @returns The created order with items and calculated total
   */
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      // Create order in PostgreSQL
      const order = await this.orderPostgresService.create(createOrderDto);

      // Emit event for Elasticsearch indexing through listener
      // Only emit event if PostgreSQL operation was successful
      emitOrderEvent(this.eventEmitter, OrderEventType.CREATED, order);

      return order;
    } catch (error) {
      logOrderError(this.logger, 'create', error);
      throw new BadRequestException('Failed to create order: ' + error.message);
    }
  }

  /**
   * Finds all orders using Elasticsearch with database fallback
   *
   * @returns Array of all orders with their items
   */
  async findAll(): Promise<Order[]> {
    try {
      // Try to fetch from Elasticsearch first
      return await this.orderElasticsearchService.findAll();
    } catch (error) {
      // Fallback to database if Elasticsearch fails
      this.logger.warn(
        'Falling back to database for orders retrieval',
        'OrderService',
      );
      return this.orderPostgresService.findAll();
    }
  }

  /**
   * Finds a specific order by internal ID
   *
   * @param id Order's internal numeric ID
   * @returns The order with its items
   */
  async findOne(id: number): Promise<Order> {
    try {
      // First get the order from PostgreSQL to get the UUID
      const pgOrder = await this.orderPostgresService.findOne(id);

      // Then try to get the full details from Elasticsearch using the UUID
      try {
        const esOrder = await this.orderElasticsearchService.findOneByUuid(
          pgOrder.uuid,
        );
        if (esOrder) {
          return esOrder;
        }
      } catch (error) {
        // Silently fail and continue with the PostgreSQL result
        this.logger.debug(
          `Elasticsearch query failed for UUID ${pgOrder.uuid}, using PostgreSQL result: ${error.message}`,
          'OrderService',
        );
      }

      // Return the PostgreSQL result if Elasticsearch failed or didn't have the data
      return pgOrder;
    } catch (error) {
      // If PostgreSQL query fails, propagate the error
      logOrderError(this.logger, 'findOne', error);
      throw error;
    }
  }

  /**
   * Finds a specific order by public UUID
   *
   * @param uuid Order's public UUID
   * @returns The order with its items
   */
  async findOneByUuid(uuid: string): Promise<Order> {
    // Try to fetch from Elasticsearch first
    try {
      const esOrder = await this.orderElasticsearchService.findOneByUuid(uuid);
      if (esOrder) {
        return esOrder;
      }
    } catch (error) {
      // Silently fail and continue with database
      this.logger.debug(
        `Elasticsearch query failed, falling back to database: ${error.message}`,
        'OrderService',
      );
    }

    // Fallback to PostgreSQL
    return this.orderPostgresService.findOneByUuid(uuid);
  }

  /**
   * Updates an existing order
   *
   * @param uuid Order's public UUID
   * @param updateOrderDto Order data to update (all monetary values in cents)
   * @returns The updated order
   */
  async update(uuid: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    try {
      // Update order in PostgreSQL
      const updatedOrder = await this.orderPostgresService.update(
        uuid,
        updateOrderDto,
      );

      // Emit event for Elasticsearch update
      emitOrderEvent(this.eventEmitter, OrderEventType.UPDATED, updatedOrder);

      return updatedOrder;
    } catch (error) {
      logOrderError(this.logger, 'update', error);
      throw new BadRequestException('Failed to update order: ' + error.message);
    }
  }

  /**
   * Cancels an order by changing its status to CANCELED
   *
   * @param uuid Order's public UUID
   * @returns The canceled order
   */
  async cancel(uuid: string): Promise<Order> {
    try {
      // Cancel order in PostgreSQL
      const canceledOrder = await this.orderPostgresService.cancel(uuid);

      // Emit event for Elasticsearch update
      emitOrderEvent(this.eventEmitter, OrderEventType.CANCELED, canceledOrder);

      return canceledOrder;
    } catch (error) {
      logOrderError(this.logger, 'cancel', error);
      throw new BadRequestException('Failed to cancel order: ' + error.message);
    }
  }

  /**
   * Find orders by customer ID
   *
   * @param customerId Customer ID
   * @returns Array of orders for the customer
   */
  async findByCustomer(customerId: string): Promise<Order[]> {
    try {
      // Try to fetch from Elasticsearch first
      return await this.orderElasticsearchService.findByCustomer(customerId);
    } catch (error) {
      // Fallback to database
      this.logger.warn(
        `Falling back to database for customer orders retrieval: ${error.message}`,
        'OrderService',
      );

      return this.orderPostgresService.findByCustomer(customerId);
    }
  }
}
