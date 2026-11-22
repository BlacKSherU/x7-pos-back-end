import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { JournalEntry } from 'src/core/financial-engine/journal-entry/entities/journal-entry.entity';
import { JournalEntryLine } from 'src/core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';
import { LedgerAccount } from 'src/core/financial-engine/ledger-accounts/entities/ledger-account.entity';

import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { BillingFinancialSyncController } from './billing-financial-sync.controller';
import { BillingFinancialSyncService } from './billing-financial-sync.service';

/** Cruce Billing ↔ Financial Engine: recibos e impuestos frente a asientos contables. */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Receipt,
      ReceiptTax,
      JournalEntry,
      JournalEntryLine,
      LedgerAccount,
      Merchant,
    ]),
  ],
  controllers: [BillingFinancialSyncController],
  providers: [BillingFinancialSyncService],
})
export class BillingFinancialSyncModule {}
