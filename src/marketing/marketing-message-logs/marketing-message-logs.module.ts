import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingMessageLogsService } from './marketing-message-logs.service';
import { MarketingMessageLogsController } from './marketing-message-logs.controller';
import { MarketingMessageLog } from './entities/marketing-message-log.entity';
import { MarketingCampaign } from '../marketing_campaing/entities/marketing_campaing.entity';
import { MarketingAutomation } from '../marketing-automations/entities/marketing-automation.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketingMessageLog,
      MarketingCampaign,
      MarketingAutomation,
      Customer,
    ]),
  ],
  controllers: [MarketingMessageLogsController],
  providers: [MarketingMessageLogsService],
  exports: [MarketingMessageLogsService],
})
export class MarketingMessageLogsModule {}
