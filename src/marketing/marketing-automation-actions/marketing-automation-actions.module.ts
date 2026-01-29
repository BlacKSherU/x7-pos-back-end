import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingAutomationActionsService } from './marketing-automation-actions.service';
import { MarketingAutomationActionsController } from './marketing-automation-actions.controller';
import { MarketingAutomationAction } from './entities/marketing-automation-action.entity';
import { MarketingAutomation } from '../marketing-automations/entities/marketing-automation.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingAutomationAction, MarketingAutomation]),
  ],
  controllers: [MarketingAutomationActionsController],
  providers: [MarketingAutomationActionsService],
  exports: [MarketingAutomationActionsService],
})
export class MarketingAutomationActionsModule {}
