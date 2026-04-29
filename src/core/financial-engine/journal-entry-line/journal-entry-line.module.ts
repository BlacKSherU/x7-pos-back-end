import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { JournalEntryLineService } from './journal-entry-line.service';
import { JournalEntryLineController } from './journal-entry-line.controller';
import { JournalEntryLine } from './entities/journal-entry-line.entity';
import { JournalEntry } from '../journal-entry/entities/journal-entry.entity';
import { LedgerAccount } from '../ledger-accounts/entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      JournalEntryLine,
      JournalEntry,
      LedgerAccount,
      Company,
      Merchant,
    ]),
  ],
  controllers: [JournalEntryLineController],
  providers: [JournalEntryLineService],
  exports: [JournalEntryLineService],
})
export class JournalEntryLineModule {}
