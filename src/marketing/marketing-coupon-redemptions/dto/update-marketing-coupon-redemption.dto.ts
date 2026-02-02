import { PartialType } from '@nestjs/swagger';
import { CreateMarketingCouponRedemptionDto } from './create-marketing-coupon-redemption.dto';
import { IsOptional, IsNumber, Min, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateMarketingCouponRedemptionDto extends PartialType(CreateMarketingCouponRedemptionDto) {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Marketing Coupon',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Coupon ID must be a number' })
  @Min(1, { message: 'Coupon ID must be greater than 0' })
  couponId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Order',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Order ID must be a number' })
  @Min(1, { message: 'Order ID must be greater than 0' })
  orderId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Customer',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Customer ID must be a number' })
  @Min(1, { message: 'Customer ID must be greater than 0' })
  customerId?: number;

  @ApiPropertyOptional({
    example: '2024-01-15T10:00:00Z',
    description: 'Date and time when the coupon was redeemed',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Redeemed at must be a valid date string' })
  redeemedAt?: string;

  @ApiPropertyOptional({
    example: 10.50,
    description: 'Discount amount that was applied',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Discount applied must be a number' })
  @Min(0, { message: 'Discount applied must be greater than or equal to 0' })
  discountApplied?: number;
}
