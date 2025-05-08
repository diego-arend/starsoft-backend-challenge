import {
  Controller,
  Get,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { DateRangeDto } from './dto/search-query.dto';
import { PaginationApiQueries } from './swagger/search-swagger.responses';
import { OrderStatus } from '../order/entities/order.entity';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('orders/uuid/:uuid')
  @ApiOperation({
    summary: 'Find order by UUID',
    description: 'Retrieve an order by its unique identifier (UUID)',
  })
  @ApiParam({
    name: 'uuid',
    description: 'Order UUID',
    type: String,
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, description: 'Order found successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findByUuid(@Param('uuid') uuid: string) {
    return this.searchService.findByUuid(uuid);
  }

  @Get('orders/status/:status')
  @ApiOperation({
    summary: 'Find orders by status',
    description: 'Retrieve all orders with a specific status',
  })
  @ApiParam({
    name: 'status',
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.DELIVERED,
  })
  @ApiQuery(PaginationApiQueries[0]) // page
  @ApiQuery(PaginationApiQueries[1]) // limit
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findByStatus(
    @Param('status') status: OrderStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.searchService.findByStatus(status, page, limit);
  }

  @Get('orders/date-range')
  @ApiOperation({
    summary: 'Find orders by date range',
    description: 'Retrieve orders created within a specific date range',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (ISO format)',
    example: '2023-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (ISO format)',
    example: '2023-12-31T23:59:59.999Z',
  })
  @ApiQuery(PaginationApiQueries[0]) // page
  @ApiQuery(PaginationApiQueries[1]) // limit
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findByDateRange(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    const dateRange: DateRangeDto = { from, to };
    return this.searchService.findByDateRange(dateRange, page, limit);
  }

  @Get('orders/product/:productId')
  @ApiOperation({
    summary: 'Find orders containing a specific product',
    description: 'Retrieve orders that contain a specific product by its ID',
  })
  @ApiParam({
    name: 'productId',
    description: 'Product UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery(PaginationApiQueries[0]) // page
  @ApiQuery(PaginationApiQueries[1]) // limit
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findByProductId(
    @Param('productId') productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.searchService.findByProductId(productId, page, limit);
  }

  @Get('orders/product-name')
  @ApiOperation({
    summary: 'Find orders by product name',
    description:
      'Retrieve orders that contain products with names matching the search text',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Product name search text',
    example: 'smartphone',
  })
  @ApiQuery(PaginationApiQueries[0]) // page
  @ApiQuery(PaginationApiQueries[1]) // limit
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findByProductName(
    @Query('q') productName: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.searchService.findByProductName(productName, page, limit);
  }

  @Get('orders/customer/:customerId')
  @ApiOperation({
    summary: 'Find orders by customer ID',
    description: 'Retrieve all orders for a specific customer',
  })
  @ApiParam({
    name: 'customerId',
    description: 'Customer UUID',
    type: String,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery(PaginationApiQueries[0]) // page
  @ApiQuery(PaginationApiQueries[1]) // limit
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid search parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findByCustomerId(
    @Param('customerId') customerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.searchService.findByCustomerId(customerId, page, limit);
  }
}
