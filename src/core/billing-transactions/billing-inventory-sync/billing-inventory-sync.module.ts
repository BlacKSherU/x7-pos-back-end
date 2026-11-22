import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';
import { Supply } from 'src/inventory/supplies/entities/supply.entity';
import { ProductRecipe } from 'src/inventory/products-inventory/recipes/entities/product-recipe.entity';
import { Item } from 'src/inventory/products-inventory/stocks/items/entities/item.entity';
import { Movement } from 'src/inventory/products-inventory/stocks/movements/entities/movement.entity';
import { Location } from 'src/inventory/products-inventory/stocks/locations/entities/location.entity';
import { InventoryStockAlert } from 'src/inventory/stock-alerts/entities/inventory-stock-alert.entity';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { BillingInventorySyncController } from './billing-inventory-sync.controller';
import { BillingInventorySyncService } from './billing-inventory-sync.service';

/**
 * Facturación ↔ inventario: grid de líneas de recibo contra las deducciones de stock de su orden,
 * métricas del header y validación de stock previa a facturar. Solo lee las tablas de inventario;
 * la deducción la sigue haciendo SaleInventoryDeductionService.
 */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      ReceiptItem,
      Order,
      Merchant,
      Product,
      Variant,
      Supply,
      ProductRecipe,
      Item,
      Movement,
      Location,
      Receipt,
      InventoryStockAlert,
    ]),
  ],
  controllers: [BillingInventorySyncController],
  providers: [BillingInventorySyncService],
})
export class BillingInventorySyncModule {}
