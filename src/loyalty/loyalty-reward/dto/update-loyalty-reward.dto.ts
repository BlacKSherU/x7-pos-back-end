import { PartialType } from '@nestjs/swagger';
import { CreateLoyaltyRewardDto } from './create-loyalty-reward.dto';

export class UpdateLoyaltyRewardDto extends PartialType(
  CreateLoyaltyRewardDto,
) {}
