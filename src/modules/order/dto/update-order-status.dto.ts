import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../entities/order.entity';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    description: 'New status for the order',
    example: OrderStatus.PROCESSING,
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(OrderStatus, { message: 'Invalid order status' })
  status: OrderStatus;
}
