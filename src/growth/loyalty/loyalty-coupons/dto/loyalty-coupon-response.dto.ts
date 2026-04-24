import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../../common/dtos/success-response.dto';
import { LoyaltyCustomerLittleResponseDto } from '../../loyalty-customer/dto/loyalty-customer-response.dto';
import { LoyaltyRewardLittleResponseDto } from '../../loyalty-reward/dto/loyalty-reward-response.dto';
import { LoyaltyCouponStatus } from '../constants/loyalty-coupons-status.enum';

export class LoyaltyCouponResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the coupon',
  })
  id: number;

  @ApiProperty({
    type: () => LoyaltyCustomerLittleResponseDto,
    description: 'Loyalty customer who owns the coupon',
    nullable: true,
  })
  loyaltyCustomer: LoyaltyCustomerLittleResponseDto | null;

  @ApiProperty({
    example: 'COUPON123',
    description: 'Unique code for the coupon',
  })
  code: string;

  @ApiProperty({
    type: () => LoyaltyRewardLittleResponseDto,
    description: 'Reward associated with the coupon',
    nullable: true,
  })
  reward: LoyaltyRewardLittleResponseDto | null;

  @ApiProperty({
    example: 'ACTIVE',
    description: 'Status of the coupon',
    enum: LoyaltyCouponStatus,
  })
  status: LoyaltyCouponStatus;

  @ApiProperty({
    example: 10.5,
    description: 'Discount value associated with the coupon',
  })
  discount_value: number;

  @ApiProperty({
    description: 'Expiration date of the coupon',
  })
  expires_at: Date;

  @ApiProperty({
    description: 'Creation date of the coupon',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Date when the coupon was redeemed',
    nullable: true,
  })
  redeemed_at: Date | null;
}

export class OneLoyaltyCouponResponse extends SuccessResponse {
  @ApiProperty({
    type: () => LoyaltyCouponResponseDto,
    description: 'The loyalty coupon',
  })
  data: LoyaltyCouponResponseDto;
}
