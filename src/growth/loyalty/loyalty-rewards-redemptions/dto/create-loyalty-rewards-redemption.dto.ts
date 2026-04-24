import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLoyaltyRewardsRedemptionDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the loyalty customer who redeemed the reward',
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  loyalty_customer_id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the reward being redeemed',
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  reward_id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the order where the reward was redeemed',
  })
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  order_id: number;
}
