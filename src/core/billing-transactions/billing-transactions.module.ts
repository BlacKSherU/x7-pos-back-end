import { Module } from '@nestjs/common';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReceiptItemModule } from './receipt-item/receipt-item.module';
import { ReceiptTaxModule } from './receipt-tax/receipt-tax.module';
import { BillingInventorySyncModule } from './billing-inventory-sync/billing-inventory-sync.module';

@Module({
  imports: [
    ReceiptsModule,
    ReceiptItemModule,
    ReceiptTaxModule,
    BillingInventorySyncModule,
  ],
})
export class BillingTransactionsModule {}
