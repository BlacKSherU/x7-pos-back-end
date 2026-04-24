import { Module } from '@nestjs/common';
import { DiningSystemController } from './dining-system.controller';
import { DiningSystemService } from './dining-system.service';
import { TablesModule } from './tables/tables.module';
import { TableAssignmentsModule } from './table-assignments/table-assignments.module';
import { FloorPlanModule } from './floor-plan/floor-plan.module';
import { FloorZoneModule } from './floor-zone/floor-zone.module';

@Module({
  imports: [
    TablesModule,
    TableAssignmentsModule,
    FloorPlanModule,
    FloorZoneModule,
  ],
  controllers: [DiningSystemController],
  providers: [DiningSystemService],
  exports: [
    TablesModule,
    TableAssignmentsModule,
    FloorPlanModule,
    FloorZoneModule,
  ],
})
export class DiningSystemModule {}
