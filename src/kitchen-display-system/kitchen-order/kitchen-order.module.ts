import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenOrderService } from './kitchen-order.service';
import { KitchenOrderController } from './kitchen-order.controller';
import { KitchenOrder } from './entities/kitchen-order.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Order } from '../../orders/entities/order.entity';
import { OnlineOrder } from '../../online-ordering-system/online-order/entities/online-order.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KitchenOrder, Merchant, Order, OnlineOrder, KitchenStation]),
  ],
  controllers: [KitchenOrderController],
  providers: [KitchenOrderService],
  exports: [KitchenOrderService],
})
export class KitchenOrderModule {}
