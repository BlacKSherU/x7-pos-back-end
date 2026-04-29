import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenOrderService } from './kitchen-order.service';
import { KitchenOrderController } from './kitchen-order.controller';
import { KitchenOrderSyncService } from './kitchen-order-sync.service';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { KitchenOrderItem } from '../kitchen-order-item/entities/kitchen-order-item.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { OnlineOrder } from '../../../commerce/online-ordering-system/online-order/entities/online-order.entity';
import { Order } from '../../pos/orders/entities/order.entity';
import { OrderItem } from '../../pos/order-item/entities/order-item.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { OrdersModule } from '../../pos/orders/orders.module';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      KitchenOrder,
      KitchenOrderItem,
      OrderItem,
      Merchant,
      Order,
      OnlineOrder,
      KitchenStation,
    ]),
    forwardRef(() => OrdersModule),
  ],
  controllers: [KitchenOrderController],
  providers: [KitchenOrderService, KitchenOrderSyncService],
  exports: [KitchenOrderService, KitchenOrderSyncService],
})
export class KitchenOrderModule {}
