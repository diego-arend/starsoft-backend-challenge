import {
  IsNotEmpty,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @ApiProperty({
    description: 'Customer ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  customerId: string;

  @ApiProperty({
    description:
      'Order items (all monetary values in cents. EX: 99999 = 999.99)',
    type: [OrderItemDto],
  })
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
