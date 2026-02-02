import { IsNotEmpty, IsNumber, IsOptional, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateMarketingCouponRedemptionDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Marketing Coupon to redeem',
  })
  @IsNotEmpty({ message: 'Coupon ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Coupon ID must be a number' })
  @Min(1, { message: 'Coupon ID must be greater than 0' })
  couponId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order where the coupon is being redeemed',
  })
  @IsNotEmpty({ message: 'Order ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Order ID must be a number' })
  @Min(1, { message: 'Order ID must be greater than 0' })
  orderId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Customer redeeming the coupon',
  })
  @IsNotEmpty({ message: 'Customer ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Customer ID must be a number' })
  @Min(1, { message: 'Customer ID must be greater than 0' })
  customerId: number;

  @ApiPropertyOptional({
    example: '2024-01-15T10:00:00Z',
    description: 'Date and time when the coupon was redeemed (defaults to now)',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Redeemed at must be a valid date string' })
  redeemedAt?: string;

  @ApiProperty({
    example: 10.50,
    description: 'Discount amount that was applied to the order',
  })
  @IsNotEmpty({ message: 'Discount applied is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Discount applied must be a number' })
  @Min(0, { message: 'Discount applied must be greater than or equal to 0' })
  discountApplied: number;
}
