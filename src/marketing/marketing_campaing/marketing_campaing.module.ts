import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCampaignService } from './marketing_campaing.service';
import { MarketingCampaignController } from './marketing_campaing.controller';
import { MarketingCampaign } from './entities/marketing_campaing.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingCampaign, Merchant]),
  ],
  controllers: [MarketingCampaignController],
  providers: [MarketingCampaignService],
  exports: [MarketingCampaignService],
})
export class MarketingCampaignModule {}
