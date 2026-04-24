import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class UpdateOnlineMenuItemDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Online Menu',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Menu ID must be a number' })
  menuId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Identifier of the Product' })
  @IsOptional()
  @IsNumber({}, { message: 'Product ID must be a number' })
  productId?: number;

  @ApiPropertyOptional({ example: 1, description: 'Identifier of the Variant' })
  @IsOptional()
  @IsNumber({}, { message: 'Variant ID must be a number' })
  variantId?: number | null;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the item is available',
  })
  @IsOptional()
  @IsBoolean({ message: 'Is available must be a boolean value' })
  isAvailable?: boolean;

  @ApiPropertyOptional({
    example: 18.99,
    description: 'Price override for this item in the menu',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price override must be a number' })
  @Min(0, { message: 'Price override must be greater than or equal to 0' })
  priceOverride?: number | null;

  @ApiPropertyOptional({
    example: 2,
    description: 'Display order of the item in the menu',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Display order must be a number' })
  @Min(0, { message: 'Display order must be greater than or equal to 0' })
  displayOrder?: number;
}
