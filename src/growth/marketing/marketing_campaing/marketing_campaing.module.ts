import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCampaignService } from './marketing_campaing.service';
import { MarketingCampaignController } from './marketing_campaing.controller';
import { MarketingCampaign } from './entities/marketing_campaing.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([MarketingCampaign, Merchant])],
  controllers: [MarketingCampaignController],
  providers: [MarketingCampaignService],
  exports: [MarketingCampaignService],
})
export class MarketingCampaignModule {}
