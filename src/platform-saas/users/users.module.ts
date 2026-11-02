// src/platform-saas/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { Company } from '../companies/entities/company.entity';
import { Merchant } from '../merchants/entities/merchant.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { HttpModule } from '@nestjs/axios';
import { MailModule } from '../../mail/mail.module';
import { UserFeatureOverride } from '../subscriptions/entities/user-feature-override.entity';
import { FeatureShiftRole } from '../subscriptions/entities/feature-shift-role.entity';
import { Collaborator } from '../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { CompanySubscription } from '../subscriptions/company-subscriptions/entities/company-subscription.entity';
import { PlanFeature } from '../subscriptions/plan-features/entity/plan-features.entity';
import { NavItem } from '../subscriptions/entities/nav-item.entity';
import { ApplicationEntity } from '../subscriptions/applications/entity/application-entity';
import { NavCategory } from '../subscriptions/entities/nav-category.entity';
import { FeatureEntity } from '../subscriptions/features/entity/features.entity';

@Module({
  imports: [
    HttpModule,
    MailModule,
    TypeOrmModule.forFeature([
      User,
      Company,
      Merchant,
      UserFeatureOverride,
      FeatureShiftRole,
      Collaborator,
      CompanySubscription,
      PlanFeature,
      NavItem,
      ApplicationEntity,
      NavCategory,
      FeatureEntity,
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

export { UsersService };
