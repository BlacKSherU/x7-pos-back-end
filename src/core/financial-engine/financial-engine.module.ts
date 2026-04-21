import { Module } from '@nestjs/common';
import { JournalEntryModule } from './journal-entry/journal-entry.module';
import { LedgerAccountsModule } from './ledger-accounts/ledger-accounts.module';
import { JournalEntryLineModule } from './journal-entry-line/journal-entry-line.module';

@Module({
  imports: [JournalEntryModule, LedgerAccountsModule, JournalEntryLineModule],
})
export class FinancialEngineModule {}
