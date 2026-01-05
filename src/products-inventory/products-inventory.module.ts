import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsInventoryController } from './products-inventory.controller';
import { ProductsInventoryService } from './products-inventory.service';
import { ProductsModule } from './products/products.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CategoryModule } from './category/category.module';
import { VariantsModule } from './variants/variants.module';
import { ModifiersModule } from './modifiers/modifiers.module';
import { Category } from './category/entities/category.entity';
import { Variant } from './variants/entities/variant.entity';
import { Modifier } from './modifiers/entities/modifier.entity';
import { Product } from './products/entities/product.entity';
import { ItemsModule } from './stocks/items/items.module';
import { LocationsModule } from './stocks/locations/locations.module';
import { MovementsModule } from './stocks/movements/movements.module';
import { Item } from './stocks/items/entities/item.entity';
import { Movement } from './stocks/movements/entities/movement.entity';
import { Location } from './stocks/locations/entities/location.entity';
import { PurchaseOrderItem } from './purchase-order-item/entities/purchase-order-item.entity';
import { PurchaseOrder } from './purchase-order/entities/purchase-order.entity';
import { Supplier } from './suppliers/entities/supplier.entity';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module';
import { PurchaseOrderItemModule } from './purchase-order-item/purchase-order-item.module';

@Module({
  controllers: [ProductsInventoryController],
  providers: [ProductsInventoryService],
  imports: [
    TypeOrmModule.forFeature([
      Category,
      Product,
      Variant,
      Modifier,
      Item,
      Movement,
      Location,
      PurchaseOrderItem,
      PurchaseOrder,
      Supplier,
    ]),
    CategoryModule,
    ProductsModule,
    SuppliersModule,
    VariantsModule,
    ModifiersModule,
    ItemsModule,
    LocationsModule,
    MovementsModule,
    PurchaseOrderModule,
    PurchaseOrderItemModule,
  ],
  exports: [
    ProductsInventoryService,
    ProductsModule,
    CategoryModule,
    SuppliersModule,
    VariantsModule,
    ModifiersModule,
    ItemsModule,
    LocationsModule,
    MovementsModule,
    PurchaseOrderModule,
    PurchaseOrderItemModule,
  ],
})
export class ProductsInventoryModule {}
