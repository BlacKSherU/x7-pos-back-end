//src/core/configuration/merchant-tax-rule/merchant-tax-rule.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Configuration } from '../entity/configuration-entity';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { MerchantTaxRule } from './entity/merchant-tax-rule.entity';
import { MerchantTaxRuleController } from './merchant-tax-rule.controller';
import { MerchantTaxRuleService } from './merchant-tax-rule.service';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([Company, MerchantTaxRule, Configuration, User]),
  ],
  controllers: [MerchantTaxRuleController],
  providers: [MerchantTaxRuleService],
  exports: [MerchantTaxRuleService],
})
export class MerchantTaxRuleModule {}
