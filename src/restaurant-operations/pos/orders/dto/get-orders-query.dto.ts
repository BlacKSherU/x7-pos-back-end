import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive, Min, IsDateString, IsString } from 'class-validator';
import { OrderStatus } from '../constants/order-status.enum';
import { OrderBusinessStatus } from '../constants/order-business-status.enum';
import { OrderType } from '../constants/order-type.enum';

export enum OrderSortBy {
  CREATED_AT = 'createdAt',
  CLOSED_AT = 'closedAt',
  BUSINESS_STATUS = 'businessStatus',
  TYPE = 'type',
  STATUS = 'status',
}

export class GetOrdersQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  merchantId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  tableId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  collaboratorId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  subscriptionId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  customerId?: number;

  @ApiPropertyOptional({ example: OrderBusinessStatus.PENDING, enum: OrderBusinessStatus })
  @IsOptional()
  @IsEnum(OrderBusinessStatus)
  businessStatus?: OrderBusinessStatus;

  @ApiPropertyOptional({ example: OrderType.DINE_IN, enum: OrderType })
  @IsOptional()
  @IsEnum(OrderType)
  type?: OrderType;

  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ example: '2024-01-15' })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: OrderSortBy })
  @IsOptional()
  @IsEnum(OrderSortBy)
  sortBy?: OrderSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}

