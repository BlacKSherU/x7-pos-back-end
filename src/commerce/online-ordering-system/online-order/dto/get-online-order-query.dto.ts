import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OnlineOrderType } from '../constants/online-order-type.enum';
import { OnlineOrderPaymentStatus } from '../constants/online-order-payment-status.enum';

export enum OnlineOrderSortBy {
  ID = 'id',
  MERCHANT_ID = 'merchantId',
  STORE_ID = 'storeId',
  ORDER_ID = 'orderId',
  CUSTOMER_ID = 'customerId',
  TYPE = 'type',
  PAYMENT_STATUS = 'paymentStatus',
  PLACED_AT = 'placedAt',
  SCHEDULED_AT = 'scheduledAt',
  UPDATED_AT = 'updatedAt',
}

export class GetOnlineOrderQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by merchant ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  merchantId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by online store ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  storeId?: number;

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
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({
    example: OnlineOrderType.DELIVERY,
    enum: OnlineOrderType,
    description: 'Filter by order type',
  })
  @IsOptional()
  @IsEnum(OnlineOrderType)
  type?: OnlineOrderType;

  @ApiPropertyOptional({
    example: OnlineOrderPaymentStatus.PENDING,
    enum: OnlineOrderPaymentStatus,
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsEnum(OnlineOrderPaymentStatus)
  paymentStatus?: OnlineOrderPaymentStatus;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by placed date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  placedDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by scheduled date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  scheduledDate?: string;

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
    example: OnlineOrderSortBy.UPDATED_AT,
    description: 'Field to sort by',
    enum: OnlineOrderSortBy,
  })
  @IsOptional()
  @IsEnum(OnlineOrderSortBy)
  sortBy?: OnlineOrderSortBy = OnlineOrderSortBy.UPDATED_AT;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
