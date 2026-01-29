import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, MaxLength, Min, Max, IsDateString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingCouponType } from '../constants/marketing-coupon-type.enum';
import { MarketingCouponAppliesTo } from '../constants/marketing-coupon-applies-to.enum';
import { Type } from 'class-transformer';

export class CreateMarketingCouponDto {
  @ApiProperty({
    example: 'SUMMER2024',
    description: 'Unique coupon code',
  })
  @IsNotEmpty({ message: 'Code is required' })
  @IsString({ message: 'Code must be a string' })
  @MinLength(1, { message: 'Code cannot be empty' })
  @MaxLength(100, { message: 'Code cannot exceed 100 characters' })
  code: string;

  @ApiProperty({
    example: MarketingCouponType.PERCENTAGE,
    enum: MarketingCouponType,
    description: 'Type of the coupon',
  })
  @IsNotEmpty({ message: 'Type is required' })
  @IsEnum(MarketingCouponType, {
    message: 'Type must be a valid coupon type (percentage, fixed, bogo, free_item, free_delivery)',
  })
  type: MarketingCouponType;

  @ApiPropertyOptional({
    example: 10.50,
    description: 'Fixed amount discount (required for fixed type)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Percentage discount (required for percentage type, 0-100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Percentage must be a number' })
  @Min(0, { message: 'Percentage must be greater than or equal to 0' })
  @Max(100, { message: 'Percentage cannot exceed 100' })
  percentage?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum number of times the coupon can be used',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Max uses must be a number' })
  @Min(1, { message: 'Max uses must be greater than 0' })
  maxUses?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Maximum number of times a single customer can use the coupon',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Max uses per customer must be a number' })
  @Min(1, { message: 'Max uses per customer must be greater than 0' })
  maxUsesPerCustomer?: number;

  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00Z',
    description: 'Date and time when the coupon becomes valid',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Valid from must be a valid date string' })
  validFrom?: string;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59Z',
    description: 'Date and time when the coupon expires',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Valid until must be a valid date string' })
  validUntil?: string;

  @ApiPropertyOptional({
    example: 50.00,
    description: 'Minimum order amount required to use the coupon',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Min order amount must be a number' })
  @Min(0, { message: 'Min order amount must be greater than or equal to 0' })
  minOrderAmount?: number;

  @ApiProperty({
    example: MarketingCouponAppliesTo.ALL,
    enum: MarketingCouponAppliesTo,
    description: 'What the coupon applies to',
  })
  @IsNotEmpty({ message: 'Applies to is required' })
  @IsEnum(MarketingCouponAppliesTo, {
    message: 'Applies to must be a valid value (all, category, product)',
  })
  appliesTo: MarketingCouponAppliesTo;
}
