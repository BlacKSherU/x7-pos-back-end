import { IsOptional, IsString, IsNumber, IsEnum, Min, Max, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MarketingCouponType } from '../constants/marketing-coupon-type.enum';
import { MarketingCouponAppliesTo } from '../constants/marketing-coupon-applies-to.enum';

export enum MarketingCouponSortBy {
  CODE = 'code',
  TYPE = 'type',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  VALID_FROM = 'validFrom',
  VALID_UNTIL = 'validUntil',
}

export class GetMarketingCouponQueryDto {
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
    example: 'SUMMER2024',
    description: 'Filter by coupon code (partial match)',
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    example: MarketingCouponType.PERCENTAGE,
    enum: MarketingCouponType,
    description: 'Filter by coupon type',
  })
  @IsOptional()
  @IsEnum(MarketingCouponType)
  type?: MarketingCouponType;

  @ApiPropertyOptional({
    example: MarketingCouponAppliesTo.ALL,
    enum: MarketingCouponAppliesTo,
    description: 'Filter by applies to',
  })
  @IsOptional()
  @IsEnum(MarketingCouponAppliesTo)
  appliesTo?: MarketingCouponAppliesTo;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'Filter by creation date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  createdDate?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Filter by valid from date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Filter by valid until date (YYYY-MM-DD format)',
  })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({
    example: MarketingCouponSortBy.CREATED_AT,
    enum: MarketingCouponSortBy,
    description: 'Field to sort by',
  })
  @IsOptional()
  @IsEnum(MarketingCouponSortBy)
  sortBy?: MarketingCouponSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
