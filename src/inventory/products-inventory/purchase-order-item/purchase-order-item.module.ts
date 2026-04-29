import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { PurchaseOrderItemService } from './purchase-order-item.service';
import { PurchaseOrderItemController } from './purchase-order-item.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchaseOrder } from '../purchase-order/entities/purchase-order.entity';
import { Product } from '../products/entities/product.entity';
import { Variant } from '../variants/entities/variant.entity';
import { Supplier } from '../../../core/business-partners/suppliers/entities/supplier.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { ProductsModule } from '../products/products.module';
import { VariantsModule } from '../variants/variants.module';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      PurchaseOrderItem,
      PurchaseOrder,
      Product,
      Variant,
      Supplier,
      Merchant,
    ]),
    forwardRef(() => ProductsModule),
    forwardRef(() => VariantsModule),
  ],
  controllers: [PurchaseOrderItemController],
  providers: [PurchaseOrderItemService],
  exports: [PurchaseOrderItemService],
})
export class PurchaseOrderItemModule {}
