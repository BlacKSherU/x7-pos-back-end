import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingSegmentRulesService } from './marketing-segment-rules.service';
import { MarketingSegmentRulesController } from './marketing-segment-rules.controller';
import { MarketingSegmentRule } from './entities/marketing-segment-rule.entity';
import { MarketingSegment } from '../marketing-segments/entities/marketing-segment.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([MarketingSegmentRule, MarketingSegment])],
  controllers: [MarketingSegmentRulesController],
  providers: [MarketingSegmentRulesService],
  exports: [MarketingSegmentRulesService],
})
export class MarketingSegmentRulesModule {}
