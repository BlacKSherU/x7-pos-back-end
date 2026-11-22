import { Module } from '@nestjs/common';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReceiptItemModule } from './receipt-item/receipt-item.module';
import { ReceiptTaxModule } from './receipt-tax/receipt-tax.module';
import { BillingFinancialSyncModule } from './billing-financial-sync/billing-financial-sync.module';
import { BillingPartnerSyncModule } from './billing-partner-sync/billing-partner-sync.module';
import { BillingInventorySyncModule } from './billing-inventory-sync/billing-inventory-sync.module';

@Module({
  imports: [
    ReceiptsModule,
    ReceiptItemModule,
    ReceiptTaxModule,
    BillingFinancialSyncModule,
    BillingPartnerSyncModule,
    BillingInventorySyncModule,
  ],
})
export class BillingTransactionsModule {}
