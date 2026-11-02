import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySubscription } from './company-subscriptions/entities/company-subscription.entity';
import { SubscriptionPayment } from './subscription-payments/entity/subscription-payments.entity';
import { FeatureShiftRole } from './entities/feature-shift-role.entity';
import { UserFeatureOverride } from './entities/user-feature-override.entity';
import { NavCategory } from './entities/nav-category.entity';
import { NavItem } from './entities/nav-item.entity';
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
import { NavigationModule } from './navigation/navigation.module';

@Module({
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [
    SubscriptionsService,
    NavigationModule,
    TypeOrmModule.forFeature([
      FeatureShiftRole,
      UserFeatureOverride,
      NavCategory,
      NavItem,
    ]),
  ],
  imports: [
    TypeOrmModule.forFeature([
      CompanySubscription,
      SubscriptionPayment,
      FeatureShiftRole,
      UserFeatureOverride,
      NavCategory,
      NavItem,
    ]),
    SubscriptionPlanModule,
    MerchantSubscriptionModule,
    CompanySubscriptionsModule,
    ApplicationsModule,
    PlanApplicationsModule,
    SubscriptionApplicationModule,
    FeaturesModule,
    PlanFeaturesModule,
    SubscriptionPaymentsModule,
    NavigationModule,
  ],
})
export class SubscriptionsModule {}
