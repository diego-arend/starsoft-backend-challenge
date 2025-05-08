import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { DateRangeDto } from './dto/search-query.dto';
import {
  PaginationApiQueries,
  SearchApiOperations,
  SearchApiParams,
  SearchApiQueries,
  CommonSearchResponses,
} from './swagger/search-swagger.responses';
import { OrderStatus } from '../order/entities/order.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('orders/uuid/:uuid')
  @ApiOperation(SearchApiOperations.findByUuid)
  @ApiParam(SearchApiParams.uuid)
  @ApiResponse({ status: 200, description: 'Order found successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse(CommonSearchResponses[0])
  @ApiResponse(CommonSearchResponses[1])
  async findByUuid(@Param('uuid') uuid: string) {
    return this.searchService.findByUuid(uuid);
  }

  @Get('orders/status/:status')
  @ApiOperation(SearchApiOperations.findByStatus)
  @ApiParam(SearchApiParams.status)
  @ApiQuery(PaginationApiQueries[0])
  @ApiQuery(PaginationApiQueries[1])
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse(CommonSearchResponses[0])
  @ApiResponse(CommonSearchResponses[1])
  async findByStatus(
    @Param('status') status: OrderStatus,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.searchService.findByStatus(status, paginationDto);
  }

  @Get('orders/date-range')
  @ApiOperation(SearchApiOperations.findByDateRange)
  @ApiQuery(SearchApiQueries.dateFrom)
  @ApiQuery(SearchApiQueries.dateTo)
  @ApiQuery(PaginationApiQueries[0])
  @ApiQuery(PaginationApiQueries[1])
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse(CommonSearchResponses[0])
  @ApiResponse(CommonSearchResponses[1])
  async findByDateRange(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query() paginationDto?: PaginationDto,
  ) {
    const dateRange: DateRangeDto = { from, to };
    return this.searchService.findByDateRange(dateRange, paginationDto);
  }

  @Get('orders/product/:productId')
  @ApiOperation(SearchApiOperations.findByProductId)
  @ApiParam(SearchApiParams.productId)
  @ApiQuery(PaginationApiQueries[0])
  @ApiQuery(PaginationApiQueries[1])
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse(CommonSearchResponses[0])
  @ApiResponse(CommonSearchResponses[1])
  async findByProductId(
    @Param('productId') productId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.searchService.findByProductId(productId, paginationDto);
  }

  @Get('orders/product-name')
  @ApiOperation(SearchApiOperations.findByProductName)
  @ApiQuery(SearchApiQueries.productName)
  @ApiQuery(PaginationApiQueries[0])
  @ApiQuery(PaginationApiQueries[1])
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse(CommonSearchResponses[0])
  @ApiResponse(CommonSearchResponses[1])
  async findByProductName(
    @Query('q') productName: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.searchService.findByProductName(productName, paginationDto);
  }

  @Get('orders/customer/:customerId')
  @ApiOperation(SearchApiOperations.findByCustomerId)
  @ApiParam(SearchApiParams.customerId)
  @ApiQuery(PaginationApiQueries[0])
  @ApiQuery(PaginationApiQueries[1])
  @ApiResponse({ status: 200, description: 'Orders found successfully' })
  @ApiResponse(CommonSearchResponses[0])
  @ApiResponse(CommonSearchResponses[1])
  async findByCustomerId(
    @Param('customerId') customerId: string,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.searchService.findByCustomerId(customerId, paginationDto);
  }
}
