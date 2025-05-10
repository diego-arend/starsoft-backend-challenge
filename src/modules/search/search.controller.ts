import {
  Controller,
  Get,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import {
  ApiTags,
  ApiExtraModels,
  ApiResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { OrderStatus } from '../order/entities/order.entity';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { OrderResponseDto } from '../order/dto/order-response.dto';
import { SearchExceptionFilter } from './filters/search-exception.filter';
import { ErrorResponseDto } from '../../common/dto/error-response.dto';
import {
  InvalidDateRangeException,
  InvalidItemsQueryException,
} from './exceptions/search-exceptions';
import { ElasticsearchSearchException } from '../../common/exceptions/elasticsearch-exceptions';
import {
  SearchSwaggerResponses,
  SwaggerParams,
  SwaggerOperations,
  ElasticsearchErrorResponse,
  ElasticsearchDateErrorResponse,
  ElasticsearchItemsErrorResponse,
} from './swagger/search-swagger-response';

@ApiTags('search')
@Controller('search')
@UseInterceptors(ClassSerializerInterceptor)
@UseFilters(SearchExceptionFilter)
@ApiExtraModels(
  OrderResponseDto,
  ErrorResponseDto,
  InvalidDateRangeException,
  InvalidItemsQueryException,
  ElasticsearchSearchException,
)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('by-status')
  @ApiOperation(SwaggerOperations.FindByStatus)
  @ApiQuery(SwaggerParams.Status)
  @ApiQuery(SwaggerParams.Page)
  @ApiQuery(SwaggerParams.Limit)
  @ApiResponse({
    ...SearchSwaggerResponses.FindByStatus.Success,
    status: 200,
  })
  @ApiResponse(SearchSwaggerResponses.FindByStatus.BadRequest)
  @ApiResponse(ElasticsearchErrorResponse)
  @HttpCode(HttpStatus.OK)
  async findByStatus(
    @Query('status') status: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedResult<OrderResponseDto>> {
    return this.searchService.findByStatus(status as OrderStatus, {
      page,
      limit,
    });
  }

  @Get('by-date')
  @ApiOperation(SwaggerOperations.FindByDateRange)
  @ApiQuery(SwaggerParams.DateFrom)
  @ApiQuery(SwaggerParams.DateTo)
  @ApiQuery(SwaggerParams.Page)
  @ApiQuery(SwaggerParams.Limit)
  @ApiResponse({
    ...SearchSwaggerResponses.FindByDateRange.Success,
    status: 200,
  })
  @ApiResponse(SearchSwaggerResponses.FindByDateRange.BadRequest)
  @ApiResponse(ElasticsearchDateErrorResponse)
  @HttpCode(HttpStatus.OK)
  async findByDateRange(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedResult<OrderResponseDto>> {
    return this.searchService.findByDateRange(
      { from, to },
      {
        page,
        limit,
      },
    );
  }

  @Get('by-items')
  @ApiOperation(SwaggerOperations.FindByItems)
  @ApiQuery(SwaggerParams.Items)
  @ApiQuery(SwaggerParams.Page)
  @ApiQuery(SwaggerParams.Limit)
  @ApiResponse({
    ...SearchSwaggerResponses.FindByItems.Success,
    status: 200,
  })
  @ApiResponse(SearchSwaggerResponses.FindByItems.BadRequest)
  @ApiResponse(ElasticsearchItemsErrorResponse)
  @HttpCode(HttpStatus.OK)
  async findByItems(
    @Query('items') items: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaginatedResult<OrderResponseDto>> {
    return this.searchService.findByItems(items, {
      page,
      limit,
    });
  }
}
