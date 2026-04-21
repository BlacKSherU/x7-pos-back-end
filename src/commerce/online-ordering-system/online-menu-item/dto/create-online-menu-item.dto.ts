import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateOnlineMenuItemDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Online Menu' })
  @IsNumber({}, { message: 'Menu ID must be a number' })
  @IsNotEmpty({ message: 'Menu ID is required' })
  menuId: number;

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

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether the item is available (defaults to true if not provided)',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'Is available must be a boolean value' })
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: 15.99,
    description: 'Price override for this item in the menu',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price override must be a number' })
  @Min(0, { message: 'Price override must be greater than or equal to 0' })
  priceOverride?: number | null;

  @ApiProperty({
    example: 1,
    description: 'Display order of the item in the menu',
  })
  @IsNumber({}, { message: 'Display order must be a number' })
  @IsNotEmpty({ message: 'Display order is required' })
  @Min(0, { message: 'Display order must be greater than or equal to 0' })
  displayOrder: number;
}
