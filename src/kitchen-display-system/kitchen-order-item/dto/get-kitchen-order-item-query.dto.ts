import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { KitchenOrderItemStatus } from '../constants/kitchen-order-item-status.enum';

export enum KitchenOrderItemSortBy {
  ID = 'id',
  KITCHEN_ORDER_ID = 'kitchenOrderId',
  ORDER_ITEM_ID = 'orderItemId',
  PRODUCT_ID = 'productId',
  VARIANT_ID = 'variantId',
  QUANTITY = 'quantity',
  PREPARED_QUANTITY = 'preparedQuantity',
  STARTED_AT = 'startedAt',
  COMPLETED_AT = 'completedAt',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetKitchenOrderItemQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by kitchen order ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  kitchenOrderId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by order item ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  orderItemId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by product ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  productId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by variant ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  variantId?: number;

  @ApiPropertyOptional({
    example: KitchenOrderItemStatus.ACTIVE,
    enum: KitchenOrderItemStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(KitchenOrderItemStatus)
  status?: KitchenOrderItemStatus;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination (minimum 1)',
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of items per page (minimum 1, maximum 100)',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: KitchenOrderItemSortBy.CREATED_AT,
    description: 'Field to sort by',
    enum: KitchenOrderItemSortBy,
  })
  @IsOptional()
  @IsEnum(KitchenOrderItemSortBy)
  sortBy?: KitchenOrderItemSortBy = KitchenOrderItemSortBy.CREATED_AT;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
