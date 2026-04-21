import { Module } from '@nestjs/common';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { MarketingModule } from './marketing/marketing.module';

@Module({
  imports: [LoyaltyModule, MarketingModule],
  exports: [LoyaltyModule, MarketingModule],
})
export class GrowthModule {}
