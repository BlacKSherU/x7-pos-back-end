import { IsOptional, IsEnum, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { OnlineOrderPaymentStatus } from '../../online-order/constants/online-order-payment-status.enum';

export enum OnlinePaymentSortBy {
  ID = 'id',
  ONLINE_ORDER_ID = 'onlineOrderId',
  PAYMENT_PROVIDER = 'paymentProvider',
  TRANSACTION_ID = 'transactionId',
  AMOUNT = 'amount',
  STATUS = 'status',
  PROCESSED_AT = 'processedAt',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetOnlinePaymentQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by online order ID',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  onlineOrderId?: number;

  @ApiPropertyOptional({
    example: 'stripe',
    description: 'Filter by payment provider',
  })
  @IsOptional()
  @IsString()
  paymentProvider?: string;

  @ApiPropertyOptional({
    example: 'txn_1234567890',
    description: 'Filter by transaction ID',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    example: OnlineOrderPaymentStatus.PAID,
    enum: OnlineOrderPaymentStatus,
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsEnum(OnlineOrderPaymentStatus)
  status?: OnlineOrderPaymentStatus;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Filter by processed date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsString()
  processedDate?: string;

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
    example: OnlinePaymentSortBy.CREATED_AT,
    description: 'Field to sort by',
    enum: OnlinePaymentSortBy,
  })
  @IsOptional()
  @IsEnum(OnlinePaymentSortBy)
  sortBy?: OnlinePaymentSortBy = OnlinePaymentSortBy.CREATED_AT;

  @ApiPropertyOptional({
    example: 'DESC',
    description: 'Sort order (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}







