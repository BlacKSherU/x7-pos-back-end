import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { KitchenOrderItemStatus } from '../constants/kitchen-order-item-status.enum';

export class BasicKitchenOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Kitchen Order ID' })
  id: number;
}

export class BasicOrderItemInfoDto {
  @ApiProperty({ example: 1, description: 'Order Item ID' })
  id: number;
}

export class BasicProductInfoDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  id: number;

  @ApiProperty({ example: 'Pizza Margherita', description: 'Product name' })
  name: string;
}

export class BasicVariantInfoDto {
  @ApiProperty({ example: 1, description: 'Variant ID' })
  id: number;

  @ApiProperty({ example: 'Large', description: 'Variant name' })
  name: string;
}

export class KitchenOrderItemResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Kitchen Order Item' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Kitchen Order' })
  kitchenOrderId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Order Item', nullable: true })
  orderItemId: number | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Product' })
  productId: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Variant', nullable: true })
  variantId: number | null;

  @ApiProperty({ example: 2, description: 'Quantity of the item' })
  quantity: number;

  @ApiProperty({ example: 1, description: 'Quantity that has been prepared' })
  preparedQuantity: number;

  @ApiProperty({
    example: KitchenOrderItemStatus.ACTIVE,
    enum: KitchenOrderItemStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  status: KitchenOrderItemStatus;

  @ApiProperty({ example: '2024-01-15T08:30:00Z', description: 'Timestamp when the item preparation was started', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Timestamp when the item preparation was completed', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ example: 'Extra sauce on the side', description: 'Notes about the kitchen order item', nullable: true })
  notes: string | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: () => BasicKitchenOrderInfoDto, description: 'Kitchen Order information' })
  kitchenOrder: BasicKitchenOrderInfoDto;

  @ApiProperty({ type: () => BasicOrderItemInfoDto, description: 'Order Item information', nullable: true })
  orderItem: BasicOrderItemInfoDto | null;

  @ApiProperty({ type: () => BasicProductInfoDto, description: 'Product information' })
  product: BasicProductInfoDto;

  @ApiProperty({ type: () => BasicVariantInfoDto, description: 'Variant information', nullable: true })
  variant: BasicVariantInfoDto | null;
}

export class OneKitchenOrderItemResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => KitchenOrderItemResponseDto, description: 'Kitchen order item data' })
  data: KitchenOrderItemResponseDto;
}

export class PaginatedKitchenOrderItemResponseDto extends SuccessResponse {
  @ApiProperty({ type: [KitchenOrderItemResponseDto], description: 'List of kitchen order items' })
  data: KitchenOrderItemResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrev: false,
    },
  })
  paginationMeta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
