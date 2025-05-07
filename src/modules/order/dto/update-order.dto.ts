import { PartialType } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
  @ApiProperty({
    description: 'Order status',
    enum: OrderStatus,
    enumName: 'OrderStatus',
    example: OrderStatus.PROCESSING,
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
