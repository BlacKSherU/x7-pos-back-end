//src/commerce/delivery-system/delivery-tracking/delivery-tracking.module.ts
import { Module } from '@nestjs/common';
import { DeliveryTrackingController } from './delivery-tracking.controller';
import { DeliveryTrackingService } from './delivery-tracking.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryTracking } from './entity/delivery-tracking.entity';
import { DeliveryAssignment } from '../delivery-assignment/entity/delivery-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryTracking, DeliveryAssignment])],
  controllers: [DeliveryTrackingController],
  providers: [DeliveryTrackingService],
})
export class DeliveryTrackingModule {}
