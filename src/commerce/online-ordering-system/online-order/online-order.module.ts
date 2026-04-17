import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineOrderService } from './online-order.service';
import { OnlineOrderController } from './online-order.controller';
import { OnlineOrder } from './entities/online-order.entity';
import { OnlineStore } from '../online-stores/entities/online-store.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OnlineOrder,
      OnlineStore,
      Order,
      Customer,
      Merchant,
    ]),
  ],
  controllers: [OnlineOrderController],
  providers: [OnlineOrderService],
  exports: [OnlineOrderService],
})
export class OnlineOrderModule {}
