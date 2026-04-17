import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItemModifiersService } from './order-item-modifiers.service';
import { OrderItemModifiersController } from './order-item-modifiers.controller';
import { OrderItemModifier } from './entities/order-item-modifier.entity';
import { OrderItem } from '../order-item/entities/order-item.entity';
import { Modifier } from '../../../inventory/products-inventory/modifiers/entities/modifier.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderItemModifier, OrderItem, Modifier, Order]),
    OrdersModule,
  ],
  controllers: [OrderItemModifiersController],
  providers: [OrderItemModifiersService],
  exports: [OrderItemModifiersService],
})
export class OrderItemModifiersModule {}
