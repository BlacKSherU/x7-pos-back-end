import { Module } from '@nestjs/common';
import { LoyaltyProgramsModule } from './loyalty-programs/loyalty-programs.module';
import { LoyaltyTierModule } from './loyalty-tier/loyalty-tier.module';
import { LoyaltyCustomerModule } from './loyalty-customer/loyalty-customer.module';
import { LoyaltyPointsTransactionModule } from './loyalty-points-transaction/loyalty-points-transaction.module';
import { LoyaltyRewardModule } from './loyalty-reward/loyalty-reward.module';
import { LoyaltyRewardsRedemptionsModule } from './loyalty-rewards-redemptions/loyalty-rewards-redemptions.module';
import { LoyaltyCouponsModule } from './loyalty-coupons/loyalty-coupons.module';

@Module({
  imports: [
    LoyaltyProgramsModule,
    LoyaltyTierModule,
    LoyaltyCustomerModule,
    LoyaltyPointsTransactionModule,
    LoyaltyRewardModule,
    LoyaltyRewardsRedemptionsModule,
    LoyaltyCouponsModule,
  ],
})
export class LoyaltyModule {}
