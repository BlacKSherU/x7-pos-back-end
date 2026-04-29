import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingAutomationsService } from './marketing-automations.service';
import { MarketingAutomationsController } from './marketing-automations.controller';
import { MarketingAutomation } from './entities/marketing-automation.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([MarketingAutomation, Merchant])],
  controllers: [MarketingAutomationsController],
  providers: [MarketingAutomationsService],
  exports: [MarketingAutomationsService],
})
export class MarketingAutomationsModule {}
