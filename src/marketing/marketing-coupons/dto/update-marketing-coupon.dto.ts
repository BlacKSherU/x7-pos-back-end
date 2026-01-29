import { PartialType } from '@nestjs/swagger';
import { CreateMarketingCouponDto } from './create-marketing-coupon.dto';
import { IsOptional, IsString, IsEnum, IsNumber, MaxLength, Min, Max, IsDateString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MarketingCouponType } from '../constants/marketing-coupon-type.enum';
import { MarketingCouponAppliesTo } from '../constants/marketing-coupon-applies-to.enum';
import { Type } from 'class-transformer';

export class UpdateMarketingCouponDto extends PartialType(CreateMarketingCouponDto) {
  @ApiPropertyOptional({
    example: 'SUMMER2024',
    description: 'Unique coupon code',
  })
  @IsOptional()
  @IsString({ message: 'Code must be a string' })
  @MinLength(1, { message: 'Code cannot be empty' })
  @MaxLength(100, { message: 'Code cannot exceed 100 characters' })
  code?: string;

  @ApiPropertyOptional({
    example: MarketingCouponType.PERCENTAGE,
    enum: MarketingCouponType,
    description: 'Type of the coupon',
  })
  @IsOptional()
  @IsEnum(MarketingCouponType, {
    message: 'Type must be a valid coupon type',
  })
  type?: MarketingCouponType;

  @ApiPropertyOptional({
    example: 10.50,
    description: 'Fixed amount discount',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount?: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Percentage discount (0-100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Percentage must be a number' })
  @Min(0, { message: 'Percentage must be greater than or equal to 0' })
  @Max(100, { message: 'Percentage cannot exceed 100' })
  percentage?: number;

  @ApiPropertyOptional({
    example: MarketingCouponAppliesTo.ALL,
    enum: MarketingCouponAppliesTo,
    description: 'What the coupon applies to',
  })
  @IsOptional()
  @IsEnum(MarketingCouponAppliesTo, {
    message: 'Applies to must be a valid value',
  })
  appliesTo?: MarketingCouponAppliesTo;
}
