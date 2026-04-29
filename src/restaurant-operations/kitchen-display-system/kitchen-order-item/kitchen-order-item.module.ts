import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenOrderItemService } from './kitchen-order-item.service';
import { KitchenOrderItemController } from './kitchen-order-item.controller';
import { KitchenOrderItem } from './entities/kitchen-order-item.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { OrderItem } from '../../pos/order-item/entities/order-item.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';
import { KitchenOrderModule } from '../kitchen-order/kitchen-order.module';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      KitchenOrderItem,
      KitchenOrder,
      OrderItem,
      Product,
      Variant,
    ]),
    forwardRef(() => KitchenOrderModule),
  ],
  controllers: [KitchenOrderItemController],
  providers: [KitchenOrderItemService],
  exports: [KitchenOrderItemService],
})
export class KitchenOrderItemModule {}
