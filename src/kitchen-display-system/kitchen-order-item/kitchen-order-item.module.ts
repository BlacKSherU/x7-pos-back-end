import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenOrderItemService } from './kitchen-order-item.service';
import { KitchenOrderItemController } from './kitchen-order-item.controller';
import { KitchenOrderItem } from './entities/kitchen-order-item.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { OrderItem } from '../../order-item/entities/order-item.entity';
import { Product } from '../../products-inventory/products/entities/product.entity';
import { Variant } from '../../products-inventory/variants/entities/variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KitchenOrderItem, KitchenOrder, OrderItem, Product, Variant]),
  ],
  controllers: [KitchenOrderItemController],
  providers: [KitchenOrderItemService],
  exports: [KitchenOrderItemService],
})
export class KitchenOrderItemModule {}
