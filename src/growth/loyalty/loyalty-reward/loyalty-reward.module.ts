import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { LoyaltyRewardService } from './loyalty-reward.service';
import { LoyaltyRewardController } from './loyalty-reward.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyReward } from './entities/loyalty-reward.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { LoyaltyProgram } from '../loyalty-programs/entities/loyalty-program.entity';
import { LoyaltyRewardsRedemption } from '../loyalty-rewards-redemptions/entities/loyalty-rewards-redemption.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      LoyaltyReward,
      Product,
      LoyaltyProgram,
      LoyaltyRewardsRedemption,
    ]),
  ],
  controllers: [LoyaltyRewardController],
  providers: [LoyaltyRewardService],
  exports: [LoyaltyRewardService],
})
export class LoyaltyRewardModule {}
