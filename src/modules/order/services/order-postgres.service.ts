import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { LoggerService } from '../../../logger/logger.service';
import {
  createOrderItems,
  calculateOrderTotal,
} from '../helpers/order.helpers';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
  OrderCreationFailedException,
  OrderUpdateFailedException,
} from '../exceptions/postgres-exceptions';

/**
 * Service for handling order operations in PostgreSQL database
 */
@Injectable()
export class OrderPostgresService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private dataSource: DataSource,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Creates a new order with its items
   *
   * @param createOrderDto Order data
   * @returns Created order with items and calculated total
   */
  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Calculate order total
      const total = calculateOrderTotal(createOrderDto.items);

      // Create order
      const order = queryRunner.manager.create(Order, {
        customerId: createOrderDto.customerId,
        status: OrderStatus.PENDING,
        total,
      });

      const savedOrder = await queryRunner.manager.save(order);

      // Create order items
      const orderItems = createOrderItems(createOrderDto.items, savedOrder.id);
      await queryRunner.manager.save(OrderItem, orderItems);

      // Commit transaction
      await queryRunner.commitTransaction();

      // Fetch complete order with items
      return this.findOneByUuid(savedOrder.uuid);
    } catch (error) {
      // Rollback in case of error
      await queryRunner.rollbackTransaction();
      this.logError('create', error);
      throw new OrderCreationFailedException(error);
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
  }

  /**
   * Finds all orders in the database
   *
   * @returns Array of orders with their items
   */
  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Finds a specific order by its internal ID
   *
   * @param id Internal numeric ID of the order
   * @returns Order with its items
   */
  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['items'],
    });

    if (!order) {
      throw new OrderNotFoundException(id);
    }

    return order;
  }

  /**
   * Finds a specific order by its public UUID
   *
   * @param uuid Public UUID of the order
   * @returns Order with its items
   */
  async findOneByUuid(uuid: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { uuid },
      relations: ['items'],
    });

    if (!order) {
      throw new OrderNotFoundException(uuid);
    }

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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the order by UUID
      const order = await this.findOneByUuid(uuid);
      this.validateOrderCanBeModified(order);

      // Update items if provided
      if (updateOrderDto.items && updateOrderDto.items.length > 0) {
        await this.updateOrderItems(
          queryRunner,
          order.id,
          updateOrderDto.items,
        );
      }

      // Update status if provided
      if (updateOrderDto.status) {
        await queryRunner.manager.update(Order, order.id, {
          status: updateOrderDto.status,
        });
      }

      // Update customer if provided
      if (updateOrderDto.customerId) {
        await queryRunner.manager.update(Order, order.id, {
          customerId: updateOrderDto.customerId,
        });
      }

      await queryRunner.commitTransaction();

      // Fetch the complete updated order
      return this.findOneByUuid(uuid);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logError('update', error);
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
    // Find the order by UUID
    const order = await this.findOneByUuid(uuid);
    this.validateOrderCanBeModified(order);

    // Update status to CANCELED using numeric ID
    await this.orderRepository.update(order.id, {
      status: OrderStatus.CANCELED,
    });

    // Fetch the complete canceled order
    return this.findOneByUuid(uuid);
  }

  /**
   * Finds orders by customer ID
   *
   * @param customerId Customer ID
   * @returns Array of customer orders
   */
  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customerId },
      relations: ['items'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Updates the items of an order
   *
   * @param queryRunner Current query runner
   * @param orderId Order ID
   * @param items New items
   */
  private async updateOrderItems(
    queryRunner: any,
    orderId: number,
    items: any[],
  ): Promise<void> {
    // Remove existing items
    await queryRunner.manager.delete(OrderItem, { orderId });

    // Calculate new total
    const total = calculateOrderTotal(items);

    // Create new items
    const orderItems = createOrderItems(items, orderId);
    await queryRunner.manager.save(OrderItem, orderItems);

    // Update order total
    await queryRunner.manager.update(Order, orderId, { total });
  }

  /**
   * Verifies if an order can be modified
   *
   * @param order Order to be verified
   * @throws OrderNotModifiableException if the order cannot be modified
   */
  private validateOrderCanBeModified(order: Order): void {
    if (
      order.status === OrderStatus.DELIVERED ||
      order.status === OrderStatus.CANCELED
    ) {
      throw new OrderNotModifiableException(order.status);
    }
  }

  /**
   * Logs an error
   *
   * @param operation Operation that failed
   * @param error Error
   */
  private logError(operation: string, error: any): void {
    this.logger.error(
      `Failed to ${operation} order in PostgreSQL: ${error.message}`,
      error.stack,
      'OrderPostgresService',
    );
  }
}
