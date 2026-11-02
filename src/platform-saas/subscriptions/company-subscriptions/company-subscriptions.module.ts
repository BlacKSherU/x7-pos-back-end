import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanySubscription } from './entities/company-subscription.entity';
import { SubscriptionPlan } from '../subscription-plan/entity/subscription-plan.entity';
import { CompanySubscriptionsController } from './company-subscriptions.controller';
import { CompanySubscriptionsService } from './company-subscriptions.service';

@Module({
  imports: [TypeOrmModule.forFeature([CompanySubscription, SubscriptionPlan])],
  controllers: [CompanySubscriptionsController],
  providers: [CompanySubscriptionsService],
})
export class CompanySubscriptionsModule {}
