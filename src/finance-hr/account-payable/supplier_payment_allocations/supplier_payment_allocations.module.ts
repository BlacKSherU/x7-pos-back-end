import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierPaymentAllocationsService } from './supplier_payment_allocations.service';
import { SupplierPaymentAllocationsController } from './supplier_payment_allocations.controller';
import { SupplierPaymentAllocation } from './entities/supplier_payment_allocation.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { SupplierCreditNote } from '../supplier-credit-notes/entities/supplier-credit-note.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SupplierPaymentAllocation,
      SupplierPayment,
      Supplier,
      SupplierCreditNote,
    ]),
  ],
  controllers: [SupplierPaymentAllocationsController],
  providers: [SupplierPaymentAllocationsService],
  exports: [SupplierPaymentAllocationsService],
})
export class SupplierPaymentAllocationsModule {}
