import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySubscription } from './company-subscriptions/entities/company-subscription.entity';
import { SubscriptionPayment } from './subscription-payments/entity/subscription-payments.entity';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionPlanModule } from './subscription-plan/subscription-plan.module';
import { MerchantSubscriptionModule } from './merchant-subscriptions/merchant-subscription.module';
import { CompanySubscriptionsModule } from './company-subscriptions/company-subscriptions.module';
import { ApplicationsModule } from './applications/applications.module';
import { PlanApplicationsModule } from './plan-applications/plan-applications.module';
import { SubscriptionApplicationModule } from './subscription-application/subscription-application.module';
import { FeaturesModule } from './features/features.module';
import { PlanFeaturesModule } from './plan-features/plan-features.module';
import { SubscriptionPaymentsModule } from './subscription-payments/subscription-payments.module';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
  imports: [
    TypeOrmModule.forFeature([CompanySubscription, SubscriptionPayment]),
    SubscriptionPlanModule,
    MerchantSubscriptionModule,
    CompanySubscriptionsModule,
    ApplicationsModule,
    PlanApplicationsModule,
    SubscriptionApplicationModule,
    FeaturesModule,
    PlanFeaturesModule,
    SubscriptionPaymentsModule,
  ],
})
export class SubscriptionsModule {}
