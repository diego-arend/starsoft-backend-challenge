import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { LoggerService } from '../../logger/logger.service';
import { OrderEventType } from './types/order-events.types';
import { OrderPostgresService } from './services/order-postgres.service';
import { emitOrderEvent } from './helpers/event.helpers';
import { logOrderError } from './helpers/logger.helpers';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
} from './exceptions/postgres-exceptions';
import { OrderResponseDto } from './dto/order-response.dto';
import {
  transformOrderToDto,
  transformPaginatedOrdersToDto,
} from './helpers/transform.helpers';
import { OrderStatus } from './entities/order.entity';
import { OrderElasticsearchService } from './services/order-elasticsearch.service';
import {
  ElasticsearchNotFoundException,
  ElasticsearchSearchException,
} from '../../common/exceptions/elasticsearch-exceptions';

/**
 * Main service that orchestrates order operations between data sources
 */
@Injectable()
export class OrderService {
  /**
   * Creates an instance of OrderService
   *
   * @param orderPostgresService - Service for order operations in PostgreSQL
   * @param orderElasticsearchService - Service for order operations in Elasticsearch
   * @param eventEmitter - Event emitter for order events
   * @param logger - Logging service
   */
  constructor(
    private readonly orderPostgresService: OrderPostgresService,
    private readonly orderElasticsearchService: OrderElasticsearchService,
    private readonly eventEmitter: EventEmitter2,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Creates a new order with items
   *
   * @param createOrderDto - Data to create the order
   * @returns The created order transformed to DTO
   * @throws BadRequestException if order creation fails
   */
  async create(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    try {
      this.logger.log(
        `Creating order for customer: ${createOrderDto.customerId}`,
        'OrderService',
      );

      const order = await this.orderPostgresService.create(createOrderDto);

      emitOrderEvent(
        this.eventEmitter,
        OrderEventType.CREATED,
        order,
        this.logger,
      );

      return transformOrderToDto(order);
    } catch (error) {
      logOrderError(this.logger, 'create', error);
      throw new BadRequestException('Failed to create order: ' + error.message);
    }
  }

  /**
   * Finds all orders using Elasticsearch with database fallback
   *
   * @param paginationDto - Pagination parameters
   * @returns Paginated result of orders
   */
  async findAll(
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<OrderResponseDto>> {
    try {
      const result =
        await this.orderElasticsearchService.findAll(paginationDto);

      return transformPaginatedOrdersToDto(result);
    } catch (error) {
      this.logger.warn(
        `Elasticsearch access error, falling back to database: ${error.message}`,
        'OrderService',
      );

      const result = await this.orderPostgresService.findAll(paginationDto);

      return transformPaginatedOrdersToDto(result);
    }
  }

  /**
   * Finds a specific order by internal ID
   *
   * @param id - Internal ID of the order
   * @returns Order with its items as DTO
   * @throws OrderNotFoundException if order is not found
   */
  async findOne(id: number): Promise<OrderResponseDto> {
    try {
      const pgOrder = await this.orderPostgresService.findOne(id);

      try {
        const esOrder = await this.orderElasticsearchService.findOneByUuid(
          pgOrder.uuid,
        );

        if (esOrder) {
          return transformOrderToDto(esOrder);
        }

        return transformOrderToDto(pgOrder);
      } catch (error) {
        if (!(error instanceof OrderNotFoundException)) {
          this.logger.warn(
            `Elasticsearch access error, using PostgreSQL result: ${error.message}`,
            'OrderService',
          );
        }

        return transformOrderToDto(pgOrder);
      }
    } catch (error) {
      logOrderError(this.logger, 'findOne', error);
      throw error;
    }
  }

  /**
   * Finds a specific order by public UUID
   *
   * @param uuid - Public UUID of the order
   * @returns Order with its items as DTO
   * @throws OrderNotFoundException if order is not found
   */
  async findOneByUuid(uuid: string): Promise<OrderResponseDto> {
    try {
      const orderFromEs =
        await this.orderElasticsearchService.findOneByUuid(uuid);
      return transformOrderToDto(orderFromEs);
    } catch (error) {
      if (error instanceof ElasticsearchNotFoundException) {
        // Converter exceção do Elasticsearch para OrderNotFoundException
        throw new OrderNotFoundException(uuid);
      }

      if (
        error?.name === 'ValidationError' ||
        error?.message?.includes('uuid is expected')
      ) {
        this.logger.warn(
          `Invalid UUID format ${uuid}, treating as not found`,
          'OrderService',
        );
        throw new OrderNotFoundException(uuid);
      }

      // Para erros de conexão ou outros problemas com Elasticsearch
      if (error instanceof ElasticsearchSearchException) {
        this.logger.error(
          `Elasticsearch search error: ${error.message}`,
          error.stack,
          'OrderService',
        );
        throw new Error(`Error accessing order system: ${error.message}`);
      }

      logOrderError(this.logger, 'findOneByUuid', error);
      throw error;
    }
  }

  /**
   * Updates an existing order
   *
   * @param uuid - UUID of the order to update
   * @param updateOrderDto - Data for updating the order
   * @returns Updated order transformed to DTO
   * @throws OrderNotFoundException if order is not found
   * @throws OrderNotModifiableException if order cannot be modified due to its status
   */
  async update(
    uuid: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    try {
      this.logger.log(`Updating order: ${uuid}`, 'OrderService');

      const currentOrder = await this.orderPostgresService.findOneByUuid(uuid);

      if (
        currentOrder.status === OrderStatus.CANCELED ||
        currentOrder.status === OrderStatus.DELIVERED
      ) {
        this.logger.warn(
          `Cannot update order with status: ${currentOrder.status}`,
          'OrderService',
        );
        throw new OrderNotModifiableException(currentOrder.status);
      }

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

      return transformOrderToDto(updatedOrder);
    } catch (error) {
      if (
        error instanceof OrderNotFoundException ||
        error instanceof OrderNotModifiableException ||
        error instanceof ElasticsearchNotFoundException
      ) {
        throw error;
      }

      logOrderError(this.logger, 'update', error);
      throw new BadRequestException('Failed to update order: ' + error.message);
    }
  }

  /**
   * Cancels an order by changing its status to CANCELED
   *
   * @param uuid - UUID of the order to cancel
   * @returns Canceled order transformed to DTO
   * @throws OrderNotFoundException if order is not found
   */
  async cancel(uuid: string): Promise<OrderResponseDto> {
    try {
      this.logger.log(`Canceling order: ${uuid}`, 'OrderService');

      const canceledOrder = await this.orderPostgresService.cancel(uuid);

      emitOrderEvent(
        this.eventEmitter,
        OrderEventType.CANCELED,
        canceledOrder,
        this.logger,
      );

      return transformOrderToDto(canceledOrder);
    } catch (error) {
      if (error instanceof OrderNotFoundException) {
        throw error;
      }

      logOrderError(this.logger, 'cancel', error);
      throw new BadRequestException('Failed to cancel order: ' + error.message);
    }
  }

  /**
   * Find orders by customer ID with pagination
   *
   * @param customerId - ID of the customer
   * @param paginationDto - Pagination parameters
   * @returns Paginated list of customer orders
   * @throws OrderNotFoundException if no orders are found for the customer
   */
  async findByCustomer(
    customerId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<OrderResponseDto>> {
    try {
      try {
        const result = await this.orderElasticsearchService.findByCustomer(
          customerId,
          paginationDto,
        );

        return transformPaginatedOrdersToDto(result);
      } catch (error) {
        if (error instanceof NotFoundException) {
          this.logger.log(
            `No orders found for customer ID: ${customerId} in Elasticsearch`,
            'OrderService',
          );

          throw new OrderNotFoundException(`customer: ${customerId}`);
        }

        if (error instanceof ElasticsearchNotFoundException) {
          this.logger.log(
            `No orders found for customer ID: ${customerId} in Elasticsearch`,
            'OrderService',
          );

          throw error;
        }

        this.logger.warn(
          `Elasticsearch access error, falling back to database: ${error.message}`,
          'OrderService',
        );

        const result = await this.orderPostgresService.findByCustomer(
          customerId,
          paginationDto,
        );

        return transformPaginatedOrdersToDto(result);
      }
    } catch (error) {
      if (
        error instanceof OrderNotFoundException ||
        error instanceof ElasticsearchNotFoundException
      ) {
        throw error;
      }

      logOrderError(this.logger, 'findByCustomer', error);
      throw new BadRequestException(
        `Failed to find customer orders: ${error.message}`,
      );
    }
  }
}
