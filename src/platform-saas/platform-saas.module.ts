import { Module } from '@nestjs/common';
import { CompaniesModule } from './companies/companies.module';
import { MerchantsModule } from './merchants/merchants.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';
import { SaasAdminModule } from './saas-admin/saas-admin.module';

@Module({
  imports: [
    CompaniesModule,
    MerchantsModule,
    SubscriptionsModule,
    UsersModule,
    SaasAdminModule,
  ],
  exports: [CompaniesModule, MerchantsModule, SubscriptionsModule, UsersModule],
})
export class PlatformSaasModule {}
