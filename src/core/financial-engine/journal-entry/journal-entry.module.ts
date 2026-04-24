import { Module } from '@nestjs/common';
import { JournalEntryService } from './journal-entry.service';
import { JournalEntryController } from './journal-entry.controller';
import { JournalEntry } from './entities/journal-entry.entity';
import { JournalEntryLine } from 'src/core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';

import { LedgerAccount } from '../ledger-accounts/entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JournalEntry,
      JournalEntryLine,
      LedgerAccount,
      Company,
      Merchant,
    ]),
  ],
  controllers: [JournalEntryController],
  providers: [JournalEntryService],
  exports: [JournalEntryService],
})
export class JournalEntryModule {}
