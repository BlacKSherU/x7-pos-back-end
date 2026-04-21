import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
  IsObject,
  MaxLength,
} from 'class-validator';

export class CreateOnlineOrderItemDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  @IsNumber({}, { message: 'Online order ID must be a number' })
  @IsNotEmpty({ message: 'Online order ID is required' })
  onlineOrderId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Product' })
  @IsNumber({}, { message: 'Product ID must be a number' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId: number;

  @ApiPropertyOptional({
    example: 1,
    description:
      'Identifier of the Variant (optional - only needed if the product has variants)',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Variant ID must be a number' })
  variantId?: number | null;

  @ApiProperty({ example: 2, description: 'Quantity of the item' })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @IsNotEmpty({ message: 'Quantity is required' })
  @Min(1, { message: 'Quantity must be greater than 0' })
  quantity: number;

  @ApiPropertyOptional({
    example: { extraSauce: true, size: 'large' },
    description: 'Modifiers applied to the item in JSON format',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Modifiers must be a valid JSON object' })
  modifiers?: Record<string, unknown> | null;

  @ApiPropertyOptional({
    example: 'Extra sauce on the side',
    description: 'Notes about the item',
    nullable: true,
    required: false,
  })
  @IsOptional()
  @MaxLength(5000, { message: 'Notes must not exceed 5000 characters' })
  notes?: string | null;
}
