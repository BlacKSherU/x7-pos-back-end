// src/restaurant-operations/dining-system/floor-plan/floor-plan.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { FloorPlanController } from './floor-plan.controller';
import { FloorPlanService } from './floor-plan.service';
import { Table } from '../tables/entities/table.entity';
import { FloorPlan } from './entity/floor-plan.entity';
import { FloorZone } from '../floor-zone/entity/floor-zone.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([Merchant, FloorZone, FloorPlan, Table])],
  controllers: [FloorPlanController],
  providers: [FloorPlanService],
})
export class FloorPlanModule {}
