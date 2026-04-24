//src/qr-code/qr-order-item/qr-order-item.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { QROrderItemController } from './qr-order-item.controller';
import { QROrderItemService } from './qr-order-item.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QROrderItem } from './entity/qr-order-item.entity';
import { QROrder } from '../qr-order/entity/qr-order.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([QROrderItem, QROrder, Product, Variant])],
  controllers: [QROrderItemController],
  providers: [QROrderItemService],
  exports: [QROrderItemService],
})
export class QROrderItemModule {}
