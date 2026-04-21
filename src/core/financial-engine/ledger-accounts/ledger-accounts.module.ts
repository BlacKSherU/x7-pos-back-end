import { Module } from '@nestjs/common';
import { LedgerAccountsService } from './ledger-accounts.service';
import { LedgerAccountsController } from './ledger-accounts.controller';
import { LedgerAccount } from './entities/ledger-account.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerAccount, Company, Merchant])],
  controllers: [LedgerAccountsController],
  providers: [LedgerAccountsService],
  exports: [LedgerAccountsService],
})
export class LedgerAccountsModule {}
