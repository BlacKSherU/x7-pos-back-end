import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierInvoicesService } from './supplier-invoices.service';
import { SupplierInvoicesController } from './supplier-invoices.controller';
import { SupplierInvoice } from './entities/supplier-invoice.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierInvoice, Company, Supplier])],
  controllers: [SupplierInvoicesController],
  providers: [SupplierInvoicesService],
  exports: [SupplierInvoicesService],
})
export class SupplierInvoicesModule {}
