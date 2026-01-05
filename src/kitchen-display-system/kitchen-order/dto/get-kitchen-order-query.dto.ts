import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { KitchenOrderBusinessStatus } from '../constants/kitchen-order-business-status.enum';

export enum KitchenOrderSortBy {
  ID = 'id',
  ORDER_ID = 'orderId',
  ONLINE_ORDER_ID = 'onlineOrderId',
  STATION_ID = 'stationId',
  PRIORITY = 'priority',
  BUSINESS_STATUS = 'businessStatus',
  STARTED_AT = 'startedAt',
  COMPLETED_AT = 'completedAt',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetKitchenOrderQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by order ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  orderId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by online order ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  onlineOrderId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by kitchen station ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  stationId?: number;

  @ApiPropertyOptional({
    example: KitchenOrderBusinessStatus.PENDING,
    enum: KitchenOrderBusinessStatus,
    description: 'Filter by business status',
  })
  @IsOptional()
  @IsEnum(KitchenOrderBusinessStatus)
  businessStatus?: KitchenOrderBusinessStatus;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by minimum priority',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(0)
  minPriority?: number;

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
    example: KitchenOrderSortBy.CREATED_AT,
    description: 'Field to sort by',
    enum: KitchenOrderSortBy,
  })
  @IsOptional()
  @IsEnum(KitchenOrderSortBy)
  sortBy?: KitchenOrderSortBy = KitchenOrderSortBy.CREATED_AT;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}






