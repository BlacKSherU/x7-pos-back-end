import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLoyaltyCouponDto } from './create-loyalty-coupon.dto';
import { LoyaltyCouponStatus } from '../constants/loyalty-coupons-status.enum';

export class UpdateLoyaltyCouponDto extends PartialType(
  CreateLoyaltyCouponDto,
) {
  @ApiProperty({
    enum: LoyaltyCouponStatus,
    description: 'Status of the coupon',
    example: LoyaltyCouponStatus.REDEEMED,
    required: false,
  })
  @IsEnum(LoyaltyCouponStatus)
  @IsOptional()
  status?: LoyaltyCouponStatus;

  @ApiProperty({
    example: 1,
    description:
      'ID of the order where the coupon is being applied (required when status = REDEEMED)',
    required: false,
  })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  order_id?: number;
}
