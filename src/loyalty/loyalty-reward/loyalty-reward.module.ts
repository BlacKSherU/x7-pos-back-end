import { Module } from '@nestjs/common';
import { LoyaltyRewardService } from './loyalty-reward.service';
import { LoyaltyRewardController } from './loyalty-reward.controller';

@Module({
  controllers: [LoyaltyRewardController],
  providers: [LoyaltyRewardService],
})
export class LoyaltyRewardModule {}
