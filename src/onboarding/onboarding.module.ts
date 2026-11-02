import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { OnboardingSession } from './entities/onboarding-session.entity';
import { User } from '../platform-saas/users/entities/user.entity';
import { Company } from '../platform-saas/companies/entities/company.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { SubscriptionPlan } from '../platform-saas/subscriptions/subscription-plan/entity/subscription-plan.entity';
import { SubscriptionPlanDisplayFeature } from '../platform-saas/subscriptions/subscription-plan/entity/subscription-plan-display-feature.entity';
import { UsersModule } from '../platform-saas/users/users.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      OnboardingSession,
      User,
      Company,
      Merchant,
      SubscriptionPlan,
      SubscriptionPlanDisplayFeature,
    ]),
    UsersModule,
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
