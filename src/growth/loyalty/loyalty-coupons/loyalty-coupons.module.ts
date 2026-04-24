import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { LoyaltyCouponsService } from './loyalty-coupons.service';
import { LoyaltyCouponsController } from './loyalty-coupons.controller';
import { LoyaltyCoupon } from './entities/loyalty-coupon.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { LoyaltyReward } from '../loyalty-reward/entities/loyalty-reward.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([LoyaltyCoupon, LoyaltyCustomer, LoyaltyReward]),
  ],
  controllers: [LoyaltyCouponsController],
  providers: [LoyaltyCouponsService],
  exports: [LoyaltyCouponsService],
})
export class LoyaltyCouponsModule {}
