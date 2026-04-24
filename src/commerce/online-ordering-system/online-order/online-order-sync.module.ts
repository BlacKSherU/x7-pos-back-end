import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineOrderItem } from '../online-order-item/entities/online-order-item.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { OrderItem } from '../../../restaurant-operations/pos/order-item/entities/order-item.entity';
import { OnlineOrderSyncService } from './online-order-sync.service';
import { OnlineOrderRealtimePublisher } from './online-order-realtime.publisher';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnlineOrder, OnlineOrderItem, Order, OrderItem]),
  ],
  providers: [OnlineOrderSyncService, OnlineOrderRealtimePublisher],
  exports: [OnlineOrderSyncService, OnlineOrderRealtimePublisher],
})
export class OnlineOrderSyncModule {}
