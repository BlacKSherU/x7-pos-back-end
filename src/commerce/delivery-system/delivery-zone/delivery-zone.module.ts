//src/commerce/delivery-system/delivery-zone/delivery-zone.module.ts
import { Module } from '@nestjs/common';
import { DeliveryZoneController } from './delivery-zone.controller';
import { DeliveryZoneService } from './delivery-zone.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryZone } from './entity/delivery-zone.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeliveryZone, Merchant])],
  controllers: [DeliveryZoneController],
  providers: [DeliveryZoneService],
})
export class DeliveryZoneModule {}
