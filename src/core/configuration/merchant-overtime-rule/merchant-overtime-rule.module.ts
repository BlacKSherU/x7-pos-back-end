//src/core/configuration/merchant-overtime-rule/merchant-overtime-rule.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { MerchantOvertimeRuleController } from './merchant-overtime-rule.controller';
import { MerchantOvertimeRuleService } from './merchant-overtime-rule.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { MerchantOvertimeRule } from './entity/merchant-overtime-rule.entity';
import { Configuration } from '../entity/configuration-entity';
import { User } from 'src/platform-saas/users/entities/user.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      Company,
      MerchantOvertimeRule,
      Configuration,
      User,
    ]),
  ],
  controllers: [MerchantOvertimeRuleController],
  providers: [MerchantOvertimeRuleService],
  exports: [MerchantOvertimeRuleService],
})
export class MerchantOvertimeRuleModule {}
