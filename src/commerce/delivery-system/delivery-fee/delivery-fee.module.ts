//src/commerce/delivery-system/delivery-fee/delivery-fee.module.ts
import { Module } from '@nestjs/common';
import { DeliveryFeeController } from './delivery-fee.controller';
import { DeliveryFeeService } from './delivery-fee.service';
import { DeliveryFee } from './entity/delivery-fee.entity';
import { DeliveryZone } from '../delivery-zone/entity/delivery-zone.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryZone, DeliveryFee])],
  controllers: [DeliveryFeeController],
  providers: [DeliveryFeeService],
})
export class DeliveryFeeModule {}
