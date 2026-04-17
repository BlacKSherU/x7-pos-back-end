import { Module } from '@nestjs/common';
import { OrderItemModule } from './order-item/order-item.module';
import { OrdersModule } from './orders/orders.module';
import { OrderPaymentsModule } from './order-payments/order-payments.module';
import { OrderTaxesModule } from './order-taxes/order-taxes.module';
import { OrderItemModifiersModule } from './order-item-modifiers/order-item-modifiers.module';

@Module({
  imports: [OrdersModule, OrderItemModule, OrderPaymentsModule, OrderTaxesModule, OrderItemModifiersModule],
  exports: [
    OrdersModule,
    OrderItemModule,
    OrderPaymentsModule,
    OrderTaxesModule,
    OrderItemModifiersModule,
  ],
})
export class PosModule {}
