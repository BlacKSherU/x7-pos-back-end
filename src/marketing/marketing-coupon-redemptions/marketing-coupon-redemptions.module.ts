import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCouponRedemptionsService } from './marketing-coupon-redemptions.service';
import { MarketingCouponRedemptionsController } from './marketing-coupon-redemptions.controller';
import { MarketingCouponRedemption } from './entities/marketing-coupon-redemption.entity';
import { MarketingCoupon } from '../marketing-coupons/entities/marketing-coupon.entity';
import { Order } from '../../orders/entities/order.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingCouponRedemption, MarketingCoupon, Order, Customer]),
  ],
  controllers: [MarketingCouponRedemptionsController],
  providers: [MarketingCouponRedemptionsService],
  exports: [MarketingCouponRedemptionsService],
})
export class MarketingCouponRedemptionsModule {}
