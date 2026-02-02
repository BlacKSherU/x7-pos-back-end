import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCampaingAudienceService } from './marketing-campaing-audience.service';
import { MarketingCampaingAudienceController } from './marketing-campaing-audience.controller';
import { MarketingCampaignAudience } from './entities/marketing-campaing-audience.entity';
import { MarketingCampaign } from '../marketing_campaing/entities/marketing_campaing.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingCampaignAudience, MarketingCampaign, Customer]),
  ],
  controllers: [MarketingCampaingAudienceController],
  providers: [MarketingCampaingAudienceService],
  exports: [MarketingCampaingAudienceService],
})
export class MarketingCampaingAudienceModule {}
