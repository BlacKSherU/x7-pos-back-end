import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsString,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoyaltyCouponStatus } from '../constants/loyalty-coupons-status.enum';

export class GetLoyaltyCouponsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    type: Number,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page for pagination',
    type: Number,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by coupon status',
    enum: LoyaltyCouponStatus,
  })
  @IsOptional()
  @IsEnum(LoyaltyCouponStatus)
  status?: LoyaltyCouponStatus;

  @ApiPropertyOptional({
    description: 'Filter by customer ID',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  loyalty_customer_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by reward ID',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  reward_id?: number;

  @ApiPropertyOptional({
    description: 'Filter by coupon code',
    type: String,
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({
    description: 'Filter by minimum discount value',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  min_discount_value?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum discount value',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  max_discount_value?: number;
}
