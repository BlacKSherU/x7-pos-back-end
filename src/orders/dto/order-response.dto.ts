import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from '../../common/dtos/success-response.dto';
import { OrderStatus } from '../constants/order-status.enum';
import { OrderBusinessStatus } from '../constants/order-business-status.enum';
import { OrderType } from '../constants/order-type.enum';

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

  @ApiProperty({ example: OrderBusinessStatus.PENDING, enum: OrderBusinessStatus })
  businessStatus: OrderBusinessStatus;

  @ApiProperty({ example: OrderType.DINE_IN, enum: OrderType })
  type: OrderType;

  @ApiProperty({ example: 1 })
  customerId: number;

  @ApiProperty({ example: OrderStatus.ACTIVE, enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z' })
  closedAt?: Date | null;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  updatedAt: Date;
}

export class OneOrderResponseDto extends SuccessResponse {
  @ApiProperty({ type: OrderResponseDto })
  data: OrderResponseDto;
}

export class PaginatedOrdersResponseDto extends SuccessResponse {
  @ApiProperty({ type: [OrderResponseDto] })
  data: OrderResponseDto[];

  @ApiProperty({
    example: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
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

  @ApiProperty({ example: OrderStatus.ACTIVE, enum: OrderStatus })
  status: OrderStatus | null;
}
