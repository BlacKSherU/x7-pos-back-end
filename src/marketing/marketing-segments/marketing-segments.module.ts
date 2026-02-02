import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingSegmentsService } from './marketing-segments.service';
import { MarketingSegmentsController } from './marketing-segments.controller';
import { MarketingSegment } from './entities/marketing-segment.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketingSegment, Merchant]),
  ],
  controllers: [MarketingSegmentsController],
  providers: [MarketingSegmentsService],
  exports: [MarketingSegmentsService],
})
export class MarketingSegmentsModule {}
