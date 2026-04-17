//src/qr-code/qr-order/qr-order.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QROrder } from './entity/qr-order.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { QRLocation } from '../qr-location/entity/qr-location.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from '../../../core/business-partners/customers/entities/customer.entity';
import { Table } from '../../../restaurant-operations/dining-system/tables/entities/table.entity';
import { QROrderController } from './qr-order.controller';
import { QROrderService } from './qr-order.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QROrder,
      Merchant,
      QRLocation,
      Customer,
      Table,
      Order,
    ]),
  ],
  controllers: [QROrderController],
  providers: [QROrderService],
  exports: [QROrderService],
})
export class QrOrderModule {}
