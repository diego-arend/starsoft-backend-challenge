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
import { logOrderError } from '../helpers/logger.helpers'; // Adicionar importação da função helper
import {
  OrderNotFoundException,
  OrderNotModifiableException,
  OrderCreationFailedException,
  OrderUpdateFailedException,
} from '../exceptions/postgres-exceptions';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PaginationService } from '../../../common/services/pagination.service';

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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const total = calculateOrderTotal(createOrderDto.items);

      const order = queryRunner.manager.create(Order, {
        customerId: createOrderDto.customerId,
        status: OrderStatus.PENDING,
        total,
      });

      const savedOrder = await queryRunner.manager.save(order);

      const orderItems = createOrderItems(createOrderDto.items, savedOrder.id);
      await queryRunner.manager.save(OrderItem, orderItems);

      await queryRunner.commitTransaction();

      return this.findOneByUuid(savedOrder.uuid);
    } catch (error) {
      await queryRunner.rollbackTransaction();

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

    const [orders, total] = await this.orderRepository.findAndCount({
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
      relations: ['items'],
    });

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
    const order = await this.findOneByUuid(uuid);

    if (!canOrderBeModified(order)) {
      throw new OrderNotModifiableException(order.status);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.processOrderUpdate(queryRunner, order, updateOrderDto);
      await queryRunner.commitTransaction();

      return this.findOneByUuid(uuid);
    } catch (error) {
      await queryRunner.rollbackTransaction();

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
    const order = await this.findOneByUuid(uuid);

    if (!canOrderBeModified(order)) {
      throw new OrderNotModifiableException(order.status);
    }

    await this.orderRepository.update(order.id, {
      status: OrderStatus.CANCELED,
    });

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

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { customerId },
      take: limit,
      skip,
      order: { createdAt: 'DESC' },
      relations: ['items'],
    });

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
   * @param order Original order
   * @param updateOrderDto Update data
   */
  private async processOrderUpdate(
    queryRunner: QueryRunner,
    order: Order,
    updateOrderDto: UpdateOrderDto,
  ): Promise<void> {
    if (updateOrderDto.items && updateOrderDto.items.length > 0) {
      await this.updateOrderItems(queryRunner, order.id, updateOrderDto.items);
    }

    if (updateOrderDto.status) {
      await queryRunner.manager.update(Order, order.id, {
        status: updateOrderDto.status,
      });
    }

    if (updateOrderDto.customerId) {
      await queryRunner.manager.update(Order, order.id, {
        customerId: updateOrderDto.customerId,
      });
    }
  }

  /**
   * Updates the items of an order
   *
   * @param queryRunner Current query runner
   * @param orderId Order ID
   * @param items New items
   */
  private async updateOrderItems(
    queryRunner: QueryRunner,
    orderId: number,
    items: any[],
  ): Promise<void> {
    await queryRunner.manager.delete(OrderItem, { orderId });

    const total = calculateOrderTotal(items);

    const orderItems = createOrderItems(items, orderId);
    await queryRunner.manager.save(OrderItem, orderItems);

    await queryRunner.manager.update(Order, orderId, { total });
  }
}
