import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { PurchaseOrderService } from './purchase-order.service';
import { PurchaseOrderController } from './purchase-order.controller';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrderItem } from '../purchase-order-item/entities/purchase-order-item.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderItem,
      Merchant,
      Supplier,
    ]),
  ],
  controllers: [PurchaseOrderController],
  providers: [PurchaseOrderService],
  exports: [PurchaseOrderService],
})
export class PurchaseOrderModule {}
