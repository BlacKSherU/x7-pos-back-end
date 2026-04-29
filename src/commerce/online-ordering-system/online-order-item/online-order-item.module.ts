import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineOrderItemService } from './online-order-item.service';
import { OnlineOrderItemController } from './online-order-item.controller';
import { OnlineOrderItem } from './entities/online-order-item.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([OnlineOrderItem, OnlineOrder, Product, Variant]),
  ],
  controllers: [OnlineOrderItemController],
  providers: [OnlineOrderItemService],
  exports: [OnlineOrderItemService],
})
export class OnlineOrderItemModule {}
