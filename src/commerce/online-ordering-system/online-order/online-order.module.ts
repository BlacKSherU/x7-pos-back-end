import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineOrderService } from './online-order.service';
import { OnlineOrderController } from './online-order.controller';
import { OnlineOrderFulfillmentService } from './online-order-fulfillment.service';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineStore } from '../online-stores/entities/online-store.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { OnlineDeliveryInfo } from '../online-delivery-info/entities/online-delivery-info.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { OrdersModule } from '../../../restaurant-operations/pos/orders/orders.module';
import { KitchenOrderModule } from '../../../restaurant-operations/kitchen-display-system/kitchen-order/kitchen-order.module';
import { OnlineOrderSyncModule } from './online-order-sync.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnlineOrder,
      OnlineStore,
      Order,
      Customer,
      Merchant,
      OnlineDeliveryInfo,
      OnlineOrderItem,
    ]),
    forwardRef(() => OrdersModule),
    forwardRef(() => KitchenOrderModule),
    OnlineOrderSyncModule,
  ],
  controllers: [OnlineOrderController],
  providers: [OnlineOrderService, OnlineOrderFulfillmentService],
  exports: [OnlineOrderService, OnlineOrderFulfillmentService],
})
export class OnlineOrderModule {}
