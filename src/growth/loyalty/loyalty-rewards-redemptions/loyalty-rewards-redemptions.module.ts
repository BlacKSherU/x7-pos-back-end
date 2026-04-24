import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyRewardsRedemptionsService } from './loyalty-rewards-redemptions.service';
import { LoyaltyRewardsRedemptionsController } from './loyalty-rewards-redemptions.controller';
import { LoyaltyRewardsRedemption } from './entities/loyalty-rewards-redemption.entity';
import { LoyaltyReward } from '../loyalty-reward/entities/loyalty-reward.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LoyaltyRewardsRedemption,
      LoyaltyReward,
      LoyaltyCustomer,
      Order,
    ]),
  ],
  controllers: [LoyaltyRewardsRedemptionsController],
  providers: [LoyaltyRewardsRedemptionsService],
  exports: [LoyaltyRewardsRedemptionsService],
})
export class LoyaltyRewardsRedemptionsModule {}
