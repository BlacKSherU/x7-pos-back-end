import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateKitchenOrderItemDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Kitchen Order',
  })
  @IsNotEmpty({ message: 'Kitchen order ID is required' })
  @IsNumber({}, { message: 'Kitchen order ID must be a number' })
  kitchenOrderId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Order Item (optional)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Order item ID must be a number' })
  orderItemId?: number | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Product',
  })
  @IsNotEmpty({ message: 'Product ID is required' })
  @IsNumber({}, { message: 'Product ID must be a number' })
  productId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Variant (optional)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Variant ID must be a number' })
  variantId?: number | null;

  @ApiProperty({
    example: 2,
    description: 'Quantity of the item',
    minimum: 1,
  })
  @IsNotEmpty({ message: 'Quantity is required' })
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be greater than 0' })
  quantity: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Quantity that has been prepared',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Prepared quantity must be an integer' })
  @Min(0, { message: 'Prepared quantity must be greater than or equal to 0' })
  preparedQuantity?: number;

  @ApiPropertyOptional({
    example: '2024-01-15T08:30:00Z',
    description: 'Timestamp when the item preparation was started',
    nullable: true,
    required: false,
  })
  @IsOptional()
  startedAt?: Date | null;

  @ApiPropertyOptional({
    example: '2024-01-15T09:00:00Z',
    description: 'Timestamp when the item preparation was completed',
    nullable: true,
    required: false,
  })
  @IsOptional()
  completedAt?: Date | null;

  @ApiPropertyOptional({
    example: 'Extra sauce on the side',
    description: 'Notes about the kitchen order item',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @MaxLength(5000, { message: 'Notes must not exceed 5000 characters' })
  notes?: string | null;
}
