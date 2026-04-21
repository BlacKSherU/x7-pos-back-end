import { Module } from '@nestjs/common';
import { FinancialEngineModule } from './financial-engine/financial-engine.module';
import { BillingTransactionsModule } from './billing-transactions/billing-transactions.module';
import { BusinessPartnersModule } from './business-partners/business-partners.module';

@Module({
  imports: [
    FinancialEngineModule,
    BillingTransactionsModule,
    BusinessPartnersModule,
  ],
})
export class CoreModule {}
