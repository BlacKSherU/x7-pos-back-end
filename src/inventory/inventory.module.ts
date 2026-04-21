import { Module } from '@nestjs/common';
import { ProductsInventoryModule } from './products-inventory/products-inventory.module';

@Module({
  imports: [ProductsInventoryModule],
})
export class InventoryModule {}
