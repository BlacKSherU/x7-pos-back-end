import { Module } from '@nestjs/common';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReceiptItemModule } from './receipt-item/receipt-item.module';
import { ReceiptTaxModule } from './receipt-tax/receipt-tax.module';
import { BillingPartnerSyncModule } from './billing-partner-sync/billing-partner-sync.module';

@Module({
  imports: [
    ReceiptsModule,
    ReceiptItemModule,
    ReceiptTaxModule,
    BillingPartnerSyncModule,
  ],
})
export class BillingTransactionsModule {}
