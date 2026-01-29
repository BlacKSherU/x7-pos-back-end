import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCouponsService } from './marketing-coupons.service';
import { MarketingCouponsController } from './marketing-coupons.controller';
import { MarketingCoupon } from './entities/marketing-coupon.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingCoupon, Merchant]),
  ],
  controllers: [MarketingCouponsController],
  providers: [MarketingCouponsService],
  exports: [MarketingCouponsService],
})
export class MarketingCouponsModule {}
