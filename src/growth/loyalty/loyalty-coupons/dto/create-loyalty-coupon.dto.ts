import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LoyaltyCouponStatus } from '../constants/loyalty-coupons-status.enum';

export class CreateLoyaltyCouponDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the loyalty customer who owns the coupon',
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  loyalty_customer_id: number;

  @ApiProperty({
    example: 'COUPON123',
    description: 'Unique code for the coupon',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    example: 1,
    description: 'ID of the reward associated with the coupon',
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  reward_id: number;

  @ApiProperty({
    description: 'Expiration date of the coupon',
    example: '2026-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsNotEmpty()
  expires_at: string;

  @ApiProperty({
    enum: LoyaltyCouponStatus,
    description: 'Status of the coupon',
    example: LoyaltyCouponStatus.ACTIVE,
    required: false,
  })
  @IsEnum(LoyaltyCouponStatus)
  @IsOptional()
  status?: LoyaltyCouponStatus;

  @ApiProperty({
    example: 10,
    description: 'Discount value of the coupon',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  discount_value?: number;
}
