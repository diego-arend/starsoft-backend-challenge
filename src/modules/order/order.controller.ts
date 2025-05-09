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
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { OrderSwaggerResponses } from './swagger/order-swagger.responses';
import {
  OrderResponseDto,
  OrderItemResponseDto,
} from './dto/order-response.dto';
import {
  OrderNotFoundException,
  OrderNotModifiableException,
  OrderCreationFailedException,
  DatabaseTransactionFailedException,
} from './exceptions/postgres-exceptions';
import { ElasticsearchSearchException } from '../../common/exceptions/elasticsearch-exceptions';
import { OrderExceptionFilter } from './filters/order-exception.filter';

@ApiTags('orders')
@Controller('orders')
@UseInterceptors(ClassSerializerInterceptor)
@UseFilters(OrderExceptionFilter)
@ApiExtraModels(
  OrderResponseDto,
  OrderItemResponseDto,
  OrderNotFoundException,
  OrderNotModifiableException,
  OrderCreationFailedException,
  DatabaseTransactionFailedException,
  ElasticsearchSearchException,
)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order' })
  @ApiResponse(OrderSwaggerResponses.Create.Success)
  @ApiResponse(OrderSwaggerResponses.Create.BadRequest)
  @ApiResponse(OrderSwaggerResponses.Create.ValidationError)
  @ApiResponse(OrderSwaggerResponses.Create.DatabaseError)
  @ApiResponse(OrderSwaggerResponses.Create.InvalidItems)
  @ApiResponse(OrderSwaggerResponses.Create.ServerError)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.orderService.create(createOrderDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all orders with pagination' })
  @ApiResponse({
    ...OrderSwaggerResponses.Get.PaginatedSuccess,
    status: 200,
  })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<OrderResponseDto>> {
    return this.orderService.findAll(paginationDto);
  }

  @Get(':uuid')
  @ApiOperation({ summary: 'Get order by UUID' })
  @ApiParam({ name: 'uuid', description: 'Order UUID' })
  @ApiResponse({
    ...OrderSwaggerResponses.Get.Success,
    status: 200,
  })
  @ApiResponse(OrderSwaggerResponses.Get.NotFound)
  @HttpCode(HttpStatus.OK)
  findOne(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<OrderResponseDto> {
    return this.orderService.findOneByUuid(uuid);
  }

  @Patch(':uuid')
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'uuid', description: 'Order UUID' })
  @ApiResponse(OrderSwaggerResponses.Update.Success)
  @ApiResponse(OrderSwaggerResponses.Update.NotModifiable)
  @ApiResponse(OrderSwaggerResponses.Update.ValidationError)
  @ApiResponse(OrderSwaggerResponses.Update.DatabaseError)
  @ApiResponse(OrderSwaggerResponses.Get.NotFound)
  @ApiResponse(OrderSwaggerResponses.Update.ServerError)
  @HttpCode(HttpStatus.OK)
  update(
    @Param('uuid', ParseUUIDPipe) uuid: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.orderService.update(uuid, updateOrderDto);
  }

  @Delete(':uuid')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiParam({ name: 'uuid', description: 'Order UUID' })
  @ApiResponse(OrderSwaggerResponses.Cancel.Success)
  @ApiResponse(OrderSwaggerResponses.Cancel.NotModifiable)
  @ApiResponse(OrderSwaggerResponses.Cancel.NotFound)
  @ApiResponse(OrderSwaggerResponses.Cancel.ServerError)
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('uuid', ParseUUIDPipe) uuid: string,
  ): Promise<OrderResponseDto> {
    return this.orderService.cancel(uuid);
  }

  @Get('customer/:customerId')
  @ApiOperation({
    summary: 'Get all orders for a specific customer with pagination',
  })
  @ApiResponse({
    ...OrderSwaggerResponses.CustomerSearch.Success,
    status: 200,
  })
  @ApiResponse(OrderSwaggerResponses.CustomerSearch.NotFound)
  @ApiResponse(OrderSwaggerResponses.CustomerSearch.ElasticsearchError)
  @ApiResponse(OrderSwaggerResponses.CustomerSearch.ElasticsearchIndexError)
  @ApiResponse(
    OrderSwaggerResponses.CustomerSearch.ElasticsearchDocumentNotFound,
  )
  @HttpCode(HttpStatus.OK)
  async findByCustomer(
    @Param('customerId') customerId: string,
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<OrderResponseDto>> {
    return this.orderService.findByCustomer(customerId, paginationDto);
  }
}
