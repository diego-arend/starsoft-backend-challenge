import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Smartphone XYZ',
  })
  @IsNotEmpty()
  @IsString()
  productName: string;

  @ApiProperty({
    description: 'Product price in cents',
    example: 99999,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @IsPositive()
  price: number;

  @ApiProperty({
    description: 'Quantity of products',
    example: 2,
  })
  @IsNotEmpty()
  @IsNumber()
  @IsInt()
  @Min(1)
  quantity: number;
}
