import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { OnlineMenuItemStatus } from '../constants/online-menu-item-status.enum';

export class BasicProductInfoDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  id: number;

  @ApiProperty({ example: 'Coca-Cola', description: 'Product name' })
  name: string;

  @ApiProperty({ example: '123456', description: 'Product SKU' })
  sku: string;

  @ApiProperty({ example: 10.99, description: 'Product base price' })
  basePrice: number;
}

export class BasicVariantInfoDto {
  @ApiProperty({ example: 1, description: 'Variant ID' })
  id: number;

  @ApiProperty({ example: 'Large', description: 'Variant name' })
  name: string;

  @ApiProperty({ example: 15.99, description: 'Variant price' })
  price: number;

  @ApiProperty({ example: '123456-L', description: 'Variant SKU' })
  sku: string;
}

export class BasicOnlineMenuInfoDto {
  @ApiProperty({ example: 1, description: 'Online Menu ID' })
  id: number;

  @ApiProperty({ example: 'Main Menu', description: 'Online Menu name' })
  name: string;
}

export class OnlineMenuItemResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Online Menu Item',
  })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Menu' })
  menuId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Product' })
  productId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Variant',
    nullable: true,
  })
  variantId: number | null;

  @ApiProperty({ example: true, description: 'Whether the item is available' })
  isAvailable: boolean;

  @ApiProperty({
    example: 15.99,
    description: 'Price override for this item in the menu',
    nullable: true,
  })
  priceOverride: number | null;

  @ApiProperty({
    example: 1,
    description: 'Display order of the item in the menu',
  })
  displayOrder: number;

  @ApiProperty({
    example: OnlineMenuItemStatus.ACTIVE,
    enum: OnlineMenuItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: OnlineMenuItemStatus;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Creation timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp',
  })
  updatedAt: Date;

  @ApiProperty({
    type: () => BasicOnlineMenuInfoDto,
    description: 'Online Menu information',
  })
  menu: BasicOnlineMenuInfoDto;

  @ApiProperty({
    type: () => BasicProductInfoDto,
    description: 'Product information',
  })
  product: BasicProductInfoDto;

  @ApiProperty({
    type: () => BasicVariantInfoDto,
    description: 'Variant information',
    nullable: true,
  })
  variant: BasicVariantInfoDto | null;
}

export class OneOnlineMenuItemResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => OnlineMenuItemResponseDto,
    description: 'Online menu item data',
  })
  data: OnlineMenuItemResponseDto;
}
