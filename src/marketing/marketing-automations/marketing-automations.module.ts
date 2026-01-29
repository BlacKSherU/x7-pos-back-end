import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingAutomationsService } from './marketing-automations.service';
import { MarketingAutomationsController } from './marketing-automations.controller';
import { MarketingAutomation } from './entities/marketing-automation.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingAutomation, Merchant]),
  ],
  controllers: [MarketingAutomationsController],
  providers: [MarketingAutomationsService],
  exports: [MarketingAutomationsService],
})
export class MarketingAutomationsModule {}
