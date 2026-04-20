import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { OnlineOrderItemStatus } from '../constants/online-order-item-status.enum';
import { OrderItemKitchenStatus } from '../../../../restaurant-operations/pos/order-item/constants/order-item-kitchen-status.enum';

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

export class BasicOnlineOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Online Order ID' })
  id: number;

  @ApiProperty({ example: 'pending', description: 'Online Order status' })
  status: string;
}

export class OnlineOrderItemResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Online Order Item' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  onlineOrderId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Product' })
  productId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Variant', nullable: true })
  variantId: number | null;

  @ApiProperty({ example: 2, description: 'Quantity of the item' })
  quantity: number;

  @ApiProperty({
    example: 15.99,
    description:
      'Unit price: from POS line when linked; otherwise Product.basePrice or Variant.price.',
  })
  unitPrice: number;

  @ApiProperty({
    example: { extraSauce: true, size: 'large' },
    description: 'Modifiers applied to the item in JSON format',
    nullable: true,
  })
  modifiers: Record<string, any> | null;

  @ApiProperty({ example: 'Extra sauce on the side', description: 'Notes about the item', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: OnlineOrderItemStatus.ACTIVE,
    enum: OnlineOrderItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: OnlineOrderItemStatus;

  @ApiProperty({ nullable: true })
  orderItemId: number | null;

  @ApiProperty({ enum: OrderItemKitchenStatus, nullable: true })
  kitchenLineStatus: OrderItemKitchenStatus | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: () => BasicOnlineOrderInfoDto, description: 'Online Order information' })
  onlineOrder: BasicOnlineOrderInfoDto;

  @ApiProperty({ type: () => BasicProductInfoDto, description: 'Product information' })
  product: BasicProductInfoDto;

  @ApiProperty({ type: () => BasicVariantInfoDto, description: 'Variant information', nullable: true })
  variant: BasicVariantInfoDto | null;
}

/** Line item when nested under OnlineOrder (no redundant `onlineOrder`). */
export class OnlineOrderItemNestedInOnlineOrderDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Online Order Item' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  onlineOrderId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Product' })
  productId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Variant', nullable: true })
  variantId: number | null;

  @ApiProperty({ example: 2, description: 'Quantity of the item' })
  quantity: number;

  @ApiProperty({
    example: 15.99,
    description:
      'Unit price: from POS line when linked; otherwise Product.basePrice or Variant.price.',
  })
  unitPrice: number;

  @ApiProperty({
    example: { extraSauce: true, size: 'large' },
    description: 'Modifiers applied to the item in JSON format',
    nullable: true,
  })
  modifiers: Record<string, any> | null;

  @ApiProperty({ example: 'Extra sauce on the side', description: 'Notes about the item', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: OnlineOrderItemStatus.ACTIVE,
    enum: OnlineOrderItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: OnlineOrderItemStatus;

  @ApiProperty({ nullable: true })
  orderItemId: number | null;

  @ApiProperty({ enum: OrderItemKitchenStatus, nullable: true })
  kitchenLineStatus: OrderItemKitchenStatus | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: () => BasicProductInfoDto, description: 'Product information' })
  product: BasicProductInfoDto;

  @ApiProperty({ type: () => BasicVariantInfoDto, description: 'Variant information', nullable: true })
  variant: BasicVariantInfoDto | null;
}

export class OneOnlineOrderItemResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => OnlineOrderItemResponseDto, description: 'Online order item data' })
  data: OnlineOrderItemResponseDto;
}

