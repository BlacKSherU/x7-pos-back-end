import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierInvoiceItemService } from './supplier-invoice-item.service';
import { SupplierInvoiceItemController } from './supplier-invoice-item.controller';
import { SupplierInvoiceItem } from './entities/supplier-invoice-item.entity';
import { SupplierInvoice } from '../supplier-invoices/entities/supplier-invoice.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupplierInvoiceItem, SupplierInvoice, Product]),
  ],
  controllers: [SupplierInvoiceItemController],
  providers: [SupplierInvoiceItemService],
  exports: [SupplierInvoiceItemService],
})
export class SupplierInvoiceItemModule {}
