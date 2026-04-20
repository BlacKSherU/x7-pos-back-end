import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum OnlineOrderItemSortBy {
  ID = 'id',
  ONLINE_ORDER_ID = 'onlineOrderId',
  PRODUCT_ID = 'productId',
  VARIANT_ID = 'variantId',
  QUANTITY = 'quantity',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetOnlineOrderItemQueryDto {
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
    example: OnlineOrderItemSortBy.CREATED_AT,
    description: 'Field to sort by',
    enum: OnlineOrderItemSortBy,
  })
  @IsOptional()
  @IsEnum(OnlineOrderItemSortBy)
  sortBy?: OnlineOrderItemSortBy = OnlineOrderItemSortBy.CREATED_AT;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

