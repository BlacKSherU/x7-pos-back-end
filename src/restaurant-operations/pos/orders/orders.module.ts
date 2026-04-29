import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Table } from '../../dining-system/tables/entities/table.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { MerchantSubscription } from '../../../platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { LoyaltyRewardsRedemption } from '../../../growth/loyalty/loyalty-rewards-redemptions/entities/loyalty-rewards-redemption.entity';
import { LoyaltyCoupon } from '../../../growth/loyalty/loyalty-coupons/entities/loyalty-coupon.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { OrderPayment } from '../order-payments/entities/order-payment.entity';
import { OrderTax } from '../order-taxes/entities/order-tax.entity';
import { OrderItemModifier } from '../order-item-modifiers/entities/order-item-modifier.entity';
import { OnlineOrderSyncModule } from '../../../commerce/online-ordering-system/online-order/online-order-sync.module';
import { AuthModule } from '../../../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    OnlineOrderSyncModule,
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      OrderPayment,
      OrderTax,
      OrderItemModifier,
      Merchant,
      Table,
      Collaborator,
      MerchantSubscription,
      Customer,
      LoyaltyRewardsRedemption,
      LoyaltyCoupon,
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
