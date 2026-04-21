import { Module } from '@nestjs/common';
import { ReceiptsModule } from './receipts/receipts.module';
import { ReceiptItemModule } from './receipt-item/receipt-item.module';
import { ReceiptTaxModule } from './receipt-tax/receipt-tax.module';

@Module({
  imports: [ReceiptsModule, ReceiptItemModule, ReceiptTaxModule],
})
export class BillingTransactionsModule {}
