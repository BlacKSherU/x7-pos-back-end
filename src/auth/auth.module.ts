// auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersModule } from '../platform-saas/users/users.module';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { User } from '../platform-saas/users/entities/user.entity';
import { Company } from '../platform-saas/companies/entities/company.entity';
import { Merchant } from '../platform-saas/merchants/entities/merchant.entity';
import { MailModule } from '../mail/mail.module';
import { MerchantSubscription } from '../platform-saas/subscriptions/merchant-subscriptions/entities/merchant-subscription.entity';
import { PlanFeature } from '../platform-saas/subscriptions/plan-features/entity/plan-features.entity';
import { SubscriptionAccessService } from './subscription-access.service';
import { FeatureAccessGuard } from './guards/feature-access.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      User,
      Company,
      Merchant,
      MerchantSubscription,
      PlanFeature,
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '1d' },
      }),
    }),
    MailModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RolesGuard,
    SubscriptionAccessService,
    FeatureAccessGuard,
  ],
  exports: [FeatureAccessGuard, SubscriptionAccessService],
})
export class AuthModule {}
