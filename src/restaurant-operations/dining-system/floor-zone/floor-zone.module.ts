//src/restaurant-operations/dining-system/floor-zone/floor-zone.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { FloorZoneController } from './floor-zone.controller';
import { FloorZoneService } from './floor-zone.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { FloorZone } from './entity/floor-zone.entity';
import { FloorPlan } from '../floor-plan/entity/floor-plan.entity';
import { Table } from '../tables/entities/table.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([Merchant, FloorZone, FloorPlan, Table])],
  controllers: [FloorZoneController],
  providers: [FloorZoneService],
})
export class FloorZoneModule {}
