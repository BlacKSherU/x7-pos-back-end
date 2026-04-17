import { PartialType } from '@nestjs/swagger';
import { CreateLoyaltyRewardsRedemptionDto } from './create-loyalty-rewards-redemption.dto';

export class UpdateLoyaltyRewardsRedemptionDto extends PartialType(
  CreateLoyaltyRewardsRedemptionDto,
) {}
