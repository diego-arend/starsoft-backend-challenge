import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Order } from './entities/order.entity';
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
  @ApiOperation({ summary: 'Get all orders' })
  @ApiResponse({
    ...OrderSwaggerResponses.Get.Success,
    type: [Order],
  })
  @ApiResponse(OrderSwaggerResponses.Get.ElasticsearchError)
  findAll(): Promise<Order[]> {
    return this.orderService.findAll();
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
  @ApiOperation({ summary: 'Get orders by customer ID' })
  @ApiParam({ name: 'customerId', description: 'Customer ID' })
  @ApiResponse({
    ...OrderSwaggerResponses.CustomerSearch.Success,
    type: [Order],
  })
  @ApiResponse(OrderSwaggerResponses.CustomerSearch.ElasticsearchError)
  findByCustomer(@Param('customerId', ParseUUIDPipe) customerId: string) {
    return this.orderService.findByCustomer(customerId);
  }
}
