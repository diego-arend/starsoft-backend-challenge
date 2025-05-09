import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { LoggerService } from '../../../logger/logger.service';
import {
  createOrderItems,
  calculateOrderTotal,
  canOrderBeModified,
} from '../helpers/order.helpers';
import { logOrderError } from '../helpers/logger.helpers';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
  OrderCreationFailedException,
  OrderUpdateFailedException,
} from '../exceptions/postgres-exceptions';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PaginationService } from '../../../common/services/pagination.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for handling order operations in PostgreSQL database
 */
@Injectable()
export class OrderPostgresService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * Creates a new order with its items
   *
   * @param createOrderDto Order data
   * @returns Created order with items and calculated total
   */
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    this.logger.log(
      `Creating new order for customer: ${createOrderDto.customerId}`,
      'OrderPostgresService',
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const total = calculateOrderTotal(createOrderDto.items);
      this.logger.log(
        `Calculated order total: ${total}`,
        'OrderPostgresService',
      );

      const order = queryRunner.manager.create(Order, {
        customerId: createOrderDto.customerId,
        status: OrderStatus.PENDING,
        total,
      });

      if (!order.uuid) {
        order.uuid = uuidv4();
      }

      const savedOrder = await queryRunner.manager.save(order);
      this.logger.log(
        `Order created with UUID: ${savedOrder.uuid}`,
        'OrderPostgresService',
      );

      const orderItems = createOrderItems(
        createOrderDto.items,
        savedOrder.uuid,
      );
      await queryRunner.manager.save(OrderItem, orderItems);
      this.logger.log(
        `Saved ${orderItems.length} order items`,
        'OrderPostgresService',
      );

      await queryRunner.commitTransaction();
      this.logger.log(
        `Transaction committed successfully`,
        'OrderPostgresService',
      );

      return this.findOneByUuid(savedOrder.uuid);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.log(
        `Transaction rolled back due to error`,
        'OrderPostgresService',
      );

      logOrderError(this.logger, 'create', error, 'OrderPostgresService');
      throw new OrderCreationFailedException(error);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Finds all orders in the database
   *
   * @returns Array of orders with their items
   */
  async findAll(
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    const { page, limit, skip } =
      this.paginationService.getPaginationParams(paginationDto);

    this.logger.log(
      `Finding all orders with pagination: page=${page}, limit=${limit}`,
      'OrderPostgresService',
    );

    const [orders, total] = await this.orderRepository.findAndCount({
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
      relations: ['items'],
    });

    this.logger.log(
      `Found ${orders.length} orders (total: ${total})`,
      'OrderPostgresService',
    );

    return this.paginationService.createPaginatedResult(
      orders,
      total,
      page,
      limit,
    );
  }

  /**
   * Finds a specific order by its internal ID
   *
   * @param id Internal numeric ID of the order
   * @returns Order with its items
   */
  async findOne(id: number): Promise<Order> {
    this.logger.log(`Finding order by ID: ${id}`, 'OrderPostgresService');

    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      this.logger.log(`Order not found with ID: ${id}`, 'OrderPostgresService');
      throw new OrderNotFoundException(id);
    }

    this.logger.log(
      `Found order with ${order.items.length} items`,
      'OrderPostgresService',
    );
    return order;
  }

  /**
   * Finds a specific order by its public UUID
   *
   * @param uuid Public UUID of the order
   * @returns Order with its items
   */
  async findOneByUuid(uuid: string): Promise<Order> {
    this.logger.log(`Finding order by UUID: ${uuid}`, 'OrderPostgresService');

    const order = await this.orderRepository.findOne({
      where: { uuid },
      relations: ['items'],
    });

    if (!order) {
      this.logger.log(
        `Order not found with UUID: ${uuid}`,
        'OrderPostgresService',
      );
      throw new OrderNotFoundException(uuid);
    }

    this.logger.log(
      `Found order with UUID: ${uuid}, status: ${order.status}, ${order.items.length} items`,
      'OrderPostgresService',
    );
    return order;
  }

  /**
   * Updates an existing order
   *
   * @param uuid Public UUID of the order
   * @param updateOrderDto Data for update
   * @returns Updated order
   */
  async update(uuid: string, updateOrderDto: UpdateOrderDto): Promise<Order> {
    this.logger.log(
      `Updating order with UUID: ${uuid}`,
      'OrderPostgresService',
    );
    const order = await this.findOneByUuid(uuid);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.processOrderUpdate(queryRunner, order, updateOrderDto);
      await queryRunner.commitTransaction();
      this.logger.log(
        `Order update transaction committed successfully`,
        'OrderPostgresService',
      );

      return this.findOneByUuid(uuid);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.log(
        `Order update transaction rolled back due to error`,
        'OrderPostgresService',
      );

      logOrderError(this.logger, 'update', error, 'OrderPostgresService');
      throw new OrderUpdateFailedException(error);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Cancels an order by changing its status to CANCELED
   *
   * @param uuid Public UUID of the order
   * @returns Canceled order
   */
  async cancel(uuid: string): Promise<Order> {
    this.logger.log(
      `Cancelling order with UUID: ${uuid}`,
      'OrderPostgresService',
    );
    const order = await this.findOneByUuid(uuid);

    if (!canOrderBeModified(order)) {
      this.logger.log(
        `Cannot cancel order with status: ${order.status}`,
        'OrderPostgresService',
      );
      throw new OrderNotModifiableException(order.status);
    }

    await this.orderRepository.update(order.id, {
      status: OrderStatus.CANCELED,
    });
    this.logger.log(
      `Order ${uuid} status updated to CANCELED`,
      'OrderPostgresService',
    );

    return this.findOneByUuid(uuid);
  }

  /**
   * Finds orders by customer ID
   *
   * @param customerId Customer ID
   * @returns Array of customer orders
   */
  async findByCustomer(
    customerId: string,
    paginationDto: PaginationDto = {},
  ): Promise<PaginatedResult<Order>> {
    const { page, limit, skip } =
      this.paginationService.getPaginationParams(paginationDto);

    this.logger.log(
      `Finding orders for customer: ${customerId} (page=${page}, limit=${limit})`,
      'OrderPostgresService',
    );

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { customerId },
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
      relations: ['items'],
    });

    this.logger.log(
      `Found ${orders.length} orders for customer ${customerId} (total: ${total})`,
      'OrderPostgresService',
    );

    return this.paginationService.createPaginatedResult(
      orders,
      total,
      page,
      limit,
    );
  }

  /**
   * Process order update with transaction
   *
   * @param queryRunner Active query runner
   * @param order
   * @param updateOrderDto
   */
  private async processOrderUpdate(
    queryRunner: QueryRunner,
    order: Order,
    updateOrderDto: UpdateOrderDto,
  ): Promise<void> {
    if (updateOrderDto.items && updateOrderDto.items.length > 0) {
      this.logger.log(
        `Updating items for order ${order.uuid} (${updateOrderDto.items.length} items)`,
        'OrderPostgresService',
      );
      await this.updateOrderItems(queryRunner, order, updateOrderDto.items);
    }

    if (updateOrderDto.status) {
      this.logger.log(
        `Updating status for order ${order.uuid} to ${updateOrderDto.status}`,
        'OrderPostgresService',
      );
      await queryRunner.manager.update(Order, order.id, {
        status: updateOrderDto.status,
      });
    }

    if (updateOrderDto.customerId) {
      this.logger.log(
        `Updating customer for order ${order.uuid} to ${updateOrderDto.customerId}`,
        'OrderPostgresService',
      );
      await queryRunner.manager.update(Order, order.id, {
        customerId: updateOrderDto.customerId,
      });
    }
  }

  /**
   * Updates the items of an order
   *
   * @param queryRunner Current query runner
   * @param order
   * @param items
   */
  private async updateOrderItems(
    queryRunner: QueryRunner,
    order: Order,
    items: any[],
  ): Promise<void> {
    this.logger.log(
      `Deleting existing items for order ${order.uuid}`,
      'OrderPostgresService',
    );
    await queryRunner.manager.delete(OrderItem, { orderUuid: order.uuid });

    const total = calculateOrderTotal(items);
    this.logger.log(
      `Calculated new total for order ${order.uuid}: ${total}`,
      'OrderPostgresService',
    );

    const orderItems = createOrderItems(items, order.uuid);
    this.logger.log(
      `Creating ${orderItems.length} new items for order ${order.uuid}`,
      'OrderPostgresService',
    );
    await queryRunner.manager.save(OrderItem, orderItems);

    this.logger.log(
      `Updating order ${order.uuid} total to ${total}`,
      'OrderPostgresService',
    );
    await queryRunner.manager.update(Order, order.id, { total });
  }
}
