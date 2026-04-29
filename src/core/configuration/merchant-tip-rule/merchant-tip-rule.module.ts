//src/core/configuration/merchant-tip-rule/merchant-tip-rule.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { MerchantTipRuleController } from './merchant-tip-rule.controller';
import { MerchantTipRuleService } from './merchant-tip-rule.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { MerchantTipRule } from './entity/merchant-tip-rule-entity';
import { Configuration } from '../entity/configuration-entity';
import { User } from 'src/platform-saas/users/entities/user.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([Company, MerchantTipRule, Configuration, User]),
  ],
  controllers: [MerchantTipRuleController],
  providers: [MerchantTipRuleService],
  exports: [MerchantTipRuleService],
})
export class MerchantTipRuleModule {}
