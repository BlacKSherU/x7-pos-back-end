import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { LoyaltyCustomerLittleResponseDto } from '../../loyalty-customer/dto/loyalty-customer-response.dto';
import { LoyaltyRewardLittleResponseDto } from '../../loyalty-reward/dto/loyalty-reward-response.dto';
import { OrderLittleResponseDto } from '../../../orders/dto/order-response.dto';

export class LoyaltyRewardsRedemptionResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier for the redemption',
  })
  id: number;

  @ApiProperty({
    type: () => LoyaltyCustomerLittleResponseDto,
    description: 'Loyalty customer who redeemed the reward',
    nullable: true,
  })
  loyaltyCustomer: LoyaltyCustomerLittleResponseDto | null;

  @ApiProperty({
    type: () => LoyaltyRewardLittleResponseDto,
    description: 'Reward being redeemed',
    nullable: true,
  })
  reward: LoyaltyRewardLittleResponseDto | null;

  @ApiProperty({
    type: () => OrderLittleResponseDto,
    description: 'Order where the reward was redeemed',
    nullable: true,
  })
  order: OrderLittleResponseDto | null;

  @ApiProperty({
    example: 100,
    description: 'Points redeemed for this reward',
  })
  redeemed_points: number;

  @ApiProperty({
    description: 'Timestamp when the reward was redeemed',
  })
  redeemed_at: Date;
}

export class OneLoyaltyRewardsRedemtionResponse extends SuccessResponse {
  @ApiProperty({
    type: () => LoyaltyRewardsRedemtionResponseDto,
    description: 'The loyalty rewards redemption',
  })
  data: LoyaltyRewardsRedemtionResponseDto;
}
