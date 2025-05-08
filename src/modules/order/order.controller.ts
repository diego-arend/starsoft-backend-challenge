import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Order } from './entities/order.entity';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrderSwaggerResponses } from './swagger/order-swagger.responses';

@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse({
    ...OrderSwaggerResponses.Create.Success,
    type: Order,
  })
  @ApiResponse(OrderSwaggerResponses.Create.BadRequest)
  @ApiResponse(OrderSwaggerResponses.Create.ServerError)
  create(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of orders',
  })
  @ApiQuery({ type: PaginationDto })
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    return this.orderService.findAll(paginationDto);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get order by UUID' })
  @ApiParam({ name: 'uuid', description: 'Order UUID' })
  @ApiResponse({
    ...OrderSwaggerResponses.Get.Success,
    type: Order,
  })
  @ApiResponse(OrderSwaggerResponses.Get.NotFound)
  findOne(@Param('uuid', ParseUUIDPipe) uuid: string): Promise<Order> {
    return this.orderService.findOneByUuid(uuid);
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'uuid', description: 'Order UUID' })
  @ApiResponse({
    ...OrderSwaggerResponses.Update.Success,
    type: Order,
  })
  @ApiResponse(OrderSwaggerResponses.Update.NotModifiable)
  @ApiResponse(OrderSwaggerResponses.Get.NotFound)
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<Order> {
    return this.orderService.update(uuid, updateOrderDto);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'uuid', description: 'Order UUID' })
  @ApiResponse({
    ...OrderSwaggerResponses.Update.Success,
    type: Order,
  })
  @ApiResponse(OrderSwaggerResponses.Update.NotModifiable)
  @ApiResponse(OrderSwaggerResponses.Get.NotFound)
  cancel(@Param('uuid', ParseUUIDPipe) uuid: string) {
    return this.orderService.cancel(uuid);
  }

  @Get('customer/:customerId')
  @ApiOperation({
    summary: 'Get all orders for a specific customer with pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of customer orders',
  })
  @ApiQuery({ type: PaginationDto })
  async findByCustomer(
    @Param('customerId') customerId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Order>> {
    return this.orderService.findByCustomer(customerId, paginationDto);
  }
}
