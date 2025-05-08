import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsUUID,
  IsString,
  IsEnum,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { OrderStatus } from '../../order/entities/order.entity';

export class DateRangeDto {
  @ApiPropertyOptional({
    example: '2023-01-01T00:00:00.000Z',
    description: 'Start date for filtering orders (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    example: '2023-12-31T23:59:59.999Z',
    description: 'End date for filtering orders (inclusive)',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class SearchQueryDto {
  @ApiPropertyOptional({
    description: 'Order UUID for exact match',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  uuid?: string;

  @ApiPropertyOptional({
    description: 'Order status',
    enum: OrderStatus,
    example: OrderStatus.DELIVERED,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Customer UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({
    description: 'Date range for filtering orders by creation date',
    type: DateRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description:
      'Array of product IDs to filter orders containing these products',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  productIds?: string[];

  @ApiPropertyOptional({
    description: 'Text to search in product names (partial match)',
    example: 'smartphone',
  })
  @IsOptional()
  @IsString()
  productText?: string;
}
