import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsDateString, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderItemStatus } from '../constants/order-item-status.enum';
import { OrderItemKitchenStatus } from '../constants/order-item-kitchen-status.enum';

export enum OrderItemSortBy {
  QUANTITY = 'quantity',
  PRICE = 'price',
  DISCOUNT = 'discount',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetOrderItemQueryDto {
  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Page number for pagination',
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Filter by order ID'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  orderId?: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Filter by product ID'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  productId?: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Filter by variant ID'
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  variantId?: number;

  @ApiPropertyOptional({
    example: OrderItemKitchenStatus.PENDING,
    enum: OrderItemKitchenStatus,
    description: 'Filter by line kitchen status',
  })
  @IsOptional()
  @IsEnum(OrderItemKitchenStatus)
  kitchenStatus?: OrderItemKitchenStatus;

  @ApiPropertyOptional({ 
    example: OrderItemStatus.ACTIVE, 
    enum: OrderItemStatus,
    description: 'Filter by status (active, deleted)'
  })
  @IsOptional()
  @IsEnum(OrderItemStatus)
  status?: OrderItemStatus;

  @ApiPropertyOptional({ 
    example: '2023-10-01', 
    description: 'Filter by creation date (YYYY-MM-DD format)'
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({ 
    example: OrderItemSortBy.CREATED_AT, 
    enum: OrderItemSortBy,
    description: 'Field to sort by'
  })
  @IsOptional()
  @IsEnum(OrderItemSortBy)
  sortBy?: OrderItemSortBy;

  @ApiPropertyOptional({ 
    example: 'DESC', 
    enum: ['ASC', 'DESC'],
    description: 'Sort order'
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}





