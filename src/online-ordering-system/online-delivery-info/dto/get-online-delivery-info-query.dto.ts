import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum OnlineDeliveryInfoSortBy {
  ID = 'id',
  ONLINE_ORDER_ID = 'onlineOrderId',
  CUSTOMER_NAME = 'customerName',
  CITY = 'city',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetOnlineDeliveryInfoQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by online order ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  onlineOrderId?: number;

  @ApiPropertyOptional({
    example: 'John Doe',
    description: 'Filter by customer name (partial match)',
  })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'Filter by city',
  })
  @IsOptional()
  @IsString()
  city?: string;

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
    example: OnlineDeliveryInfoSortBy.CREATED_AT,
    description: 'Field to sort by',
    enum: OnlineDeliveryInfoSortBy,
  })
  @IsOptional()
  @IsEnum(OnlineDeliveryInfoSortBy)
  sortBy?: OnlineDeliveryInfoSortBy = OnlineDeliveryInfoSortBy.CREATED_AT;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

