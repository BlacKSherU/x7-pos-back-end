import { IsOptional, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum MarketingCouponRedemptionSortBy {
  REDEEMED_AT = 'redeemedAt',
  DISCOUNT_APPLIED = 'discountApplied',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export class GetMarketingCouponRedemptionQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Page number for pagination',
    minimum: 1,
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
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by coupon ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  couponId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by order ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  orderId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  customerId?: number;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by redemption date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  redeemedDate?: string;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: MarketingCouponRedemptionSortBy.REDEEMED_AT,
    enum: MarketingCouponRedemptionSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(MarketingCouponRedemptionSortBy)
  sortBy?: MarketingCouponRedemptionSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
