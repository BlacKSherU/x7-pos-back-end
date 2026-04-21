import { Module } from '@nestjs/common';
import { MarketingAutomationActionsModule } from './marketing-automation-actions/marketing-automation-actions.module';
import { MarketingAutomationsModule } from './marketing-automations/marketing-automations.module';
import { MarketingCampaignModule } from './marketing_campaing/marketing_campaing.module';
import { MarketingCampaingAudienceModule } from './marketing-campaing-audience/marketing-campaing-audience.module';
import { MarketingCouponRedemptionsModule } from './marketing-coupon-redemptions/marketing-coupon-redemptions.module';
import { MarketingCouponsModule } from './marketing-coupons/marketing-coupons.module';
import { MarketingMessageLogsModule } from './marketing-message-logs/marketing-message-logs.module';
import { MarketingSegmentRulesModule } from './marketing-segment-rules/marketing-segment-rules.module';
import { MarketingSegmentsModule } from './marketing-segments/marketing-segments.module';

@Module({
  imports: [
    MarketingAutomationActionsModule,
    MarketingAutomationsModule,
    MarketingCampaignModule,
    MarketingCampaingAudienceModule,
    MarketingCouponRedemptionsModule,
    MarketingCouponsModule,
    MarketingMessageLogsModule,
    MarketingSegmentRulesModule,
    MarketingSegmentsModule,
  ],
  exports: [
    MarketingAutomationActionsModule,
    MarketingAutomationsModule,
    MarketingCampaignModule,
    MarketingCampaingAudienceModule,
    MarketingCouponRedemptionsModule,
    MarketingCouponsModule,
    MarketingMessageLogsModule,
    MarketingSegmentRulesModule,
    MarketingSegmentsModule,
  ],
})
export class MarketingModule {}
