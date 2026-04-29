import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCouponRedemptionsService } from './marketing-coupon-redemptions.service';
import { MarketingCouponRedemptionsController } from './marketing-coupon-redemptions.controller';
import { MarketingCouponRedemption } from './entities/marketing-coupon-redemption.entity';
import { MarketingCoupon } from '../marketing-coupons/entities/marketing-coupon.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      MarketingCouponRedemption,
      MarketingCoupon,
      Order,
      Customer,
    ]),
  ],
  controllers: [MarketingCouponRedemptionsController],
  providers: [MarketingCouponRedemptionsService],
  exports: [MarketingCouponRedemptionsService],
})
export class MarketingCouponRedemptionsModule {}
