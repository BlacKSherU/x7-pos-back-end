import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { OrderStatus } from '../constants/order-status.enum';
import { OrderBusinessStatus } from '../constants/order-business-status.enum';
import { OrderType } from '../constants/order-type.enum';
import { OrderSource } from '../constants/order-source.enum';
import { DeliveryStatus } from '../constants/delivery-status.enum';
import { KitchenStatus } from '../constants/kitchen-status.enum';
import { OrderItemResponseDto } from '../../order-item/dto/order-item-response.dto';
import { KitchenOrderNestedInOrderDto } from '../../../kitchen-display-system/kitchen-order/dto/kitchen-order-response.dto';
import { OnlineOrderResponseDto } from '../../../../commerce/online-ordering-system/online-order/dto/online-order-response.dto';

export class OrderResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  merchantId: number;

  @ApiProperty({ example: 1 })
  tableId: number;

  @ApiProperty({ example: 1 })
  collaboratorId: number;

  @ApiProperty({ example: 1 })
  subscriptionId: number;

  @ApiProperty({
    example: OrderBusinessStatus.PENDING,
    enum: OrderBusinessStatus,
  })
  businessStatus: OrderBusinessStatus;

  @ApiProperty({ example: OrderType.DINE_IN, enum: OrderType })
  type: OrderType;

  @ApiProperty({ example: 1 })
  customerId: number;

  @ApiProperty({ example: OrderStatus.ACTIVE, enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ example: '000001' })
  orderNumber: string;

  @ApiProperty({ enum: OrderSource })
  source: OrderSource;

  @ApiProperty({ example: 1 })
  guestCount: number;

  @ApiProperty({ example: 0 })
  subtotal: number;

  @ApiProperty({ example: 0 })
  taxTotal: number;

  @ApiProperty({ example: 0 })
  discountTotal: number;

  @ApiProperty({ example: 0 })
  tipTotal: number;

  @ApiProperty({ example: 0 })
  total: number;

  @ApiProperty({ example: 0 })
  paidTotal: number;

  @ApiProperty({ example: 0 })
  balanceDue: number;

  @ApiProperty({ example: false })
  isPaid: boolean;

  @ApiPropertyOptional()
  deliveryAddress?: string | null;

  @ApiPropertyOptional()
  deliveryZoneId?: number | null;

  @ApiProperty({ example: 0 })
  deliveryFee: number;

  @ApiProperty({ enum: DeliveryStatus })
  deliveryStatus: DeliveryStatus;

  @ApiProperty({ enum: KitchenStatus })
  kitchenStatus: KitchenStatus;

  @ApiPropertyOptional()
  readyAt?: Date | null;

  @ApiPropertyOptional()
  preparingAt?: Date | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z' })
  closedAt?: Date | null;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({
    type: () => [OrderItemResponseDto],
    description: 'POS line items (included when relations are loaded)',
  })
  orderItems?: OrderItemResponseDto[];

  @ApiPropertyOptional({
    type: () => [KitchenOrderNestedInOrderDto],
    description:
      'Kitchen tickets linked to this order (included when relations are loaded)',
  })
  kitchenOrders?: KitchenOrderNestedInOrderDto[];

  @ApiPropertyOptional({
    type: () => [OnlineOrderResponseDto],
    description:
      'Online orders linked to this POS order (included when relations are loaded)',
  })
  onlineOrders?: OnlineOrderResponseDto[];
}

export class OneOrderResponseDto extends SuccessResponse {
  @ApiProperty({ type: OrderResponseDto })
  data: OrderResponseDto;
}

export class PaginatedOrdersResponseDto extends SuccessResponse {
  @ApiProperty({ type: [OrderResponseDto] })
  data: OrderResponseDto[];

  @ApiProperty({
    example: {
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
      hasNext: false,
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

export class OrderLittleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: OrderBusinessStatus.PENDING,
    enum: OrderBusinessStatus,
  })
  businessStatus: OrderBusinessStatus | null;
}
