import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../order/entities/order.entity';

export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  @ApiProperty({
    required: false,
    description: 'Start date (ISO format)',
    example: '2023-01-01T00:00:00.000Z',
  })
  from?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({
    required: false,
    description: 'End date (ISO format)',
    example: '2023-12-31T23:59:59.999Z',
  })
  to?: string;
}

export class StatusSearchParamsDto {
  @IsEnum(OrderStatus)
  @ApiProperty({
    enum: OrderStatus,
    description: 'Order status to search for',
    example: OrderStatus.PENDING,
  })
  status: OrderStatus;
}

export class DateRangeSearchParamsDto {
  @ValidateNested()
  @Type(() => DateRangeDto)
  @ApiProperty({
    type: DateRangeDto,
    description: 'Date range for filtering orders',
  })
  dateRange: DateRangeDto;
}
