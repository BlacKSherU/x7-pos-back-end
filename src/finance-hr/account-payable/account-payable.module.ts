import { Module } from '@nestjs/common';
import { SupplierInvoicesModule } from './supplier-invoices/supplier-invoices.module';
import { SupplierInvoiceItemModule } from './supplier-invoice-item/supplier-invoice-item.module';
import { SupplierPaymentsModule } from './supplier-payments/supplier-payments.module';
import { SupplierPaymentItemsModule } from './supplier-payment-items/supplier-payment-items.module';
import { SupplierPaymentAllocationsModule } from './supplier_payment_allocations/supplier_payment_allocations.module';
import { SupplierCreditNotesModule } from './supplier-credit-notes/supplier-credit-notes.module';

@Module({
  imports: [
    SupplierInvoicesModule,
    SupplierInvoiceItemModule,
    SupplierPaymentsModule,
    SupplierPaymentItemsModule,
    SupplierPaymentAllocationsModule,
    SupplierCreditNotesModule,
  ],
  exports: [
    SupplierInvoicesModule,
    SupplierInvoiceItemModule,
    SupplierPaymentsModule,
    SupplierPaymentItemsModule,
    SupplierPaymentAllocationsModule,
    SupplierCreditNotesModule,
  ],
})
export class AccountPayableModule {}
