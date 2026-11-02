import { Module } from '@nestjs/common';
import { FinancialEngineModule } from './financial-engine/financial-engine.module';
import { BillingTransactionsModule } from './billing-transactions/billing-transactions.module';
import { BusinessPartnersModule } from './business-partners/business-partners.module';
import { ConfigurationModule } from './configuration/configuration.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    BillingTransactionsModule,
    BusinessPartnersModule,
    ConfigurationModule,
    FinancialEngineModule,
    PaymentsModule,
  ],
  exports: [
    BillingTransactionsModule,
    BusinessPartnersModule,
    ConfigurationModule,
    FinancialEngineModule,
    PaymentsModule,
  ],
})
export class CoreModule {}
