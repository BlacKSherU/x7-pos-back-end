import { Module } from '@nestjs/common';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReceiptItemModule } from './receipt-item/receipt-item.module';
import { ReceiptTaxModule } from './receipt-tax/receipt-tax.module';
import { BillingReportsModule } from './billing-reports/billing-reports.module';

@Module({
  imports: [
    ReceiptsModule,
    ReceiptItemModule,
    ReceiptTaxModule,
    BillingReportsModule,
  ],
})
export class BillingTransactionsModule {}
