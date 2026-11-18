// src/platform-saas/saas-admin/saas-admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesModule } from '../companies/companies.module';
import { Company } from '../companies/entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { User } from '../users/entities/user.entity';
import { Configuration } from 'src/core/configuration/entity/configuration-entity';
import { SubscriptionPlan } from '../subscriptions/subscription-plan/entity/subscription-plan.entity';
import { PaymentTerminal } from 'src/core/payments/payment-terminals/entities/payment-terminal.entity';
import { OrderPayment } from 'src/restaurant-operations/pos/order-payments/entities/order-payment.entity';
import { SaasAdminController } from './saas-admin.controller';
import { SaasAdminService } from './saas-admin.service';

/** /v1/saas: companies and merchant branches administered from the Platform SaaS portal. */
@Module({
  imports: [
    CompaniesModule,
    TypeOrmModule.forFeature([
      Company,
      Merchant,
      User,
      Configuration,
      SubscriptionPlan,
      PaymentTerminal,
      OrderPayment,
    ]),
  ],
  controllers: [SaasAdminController],
  providers: [SaasAdminService],
})
export class SaasAdminModule {}
