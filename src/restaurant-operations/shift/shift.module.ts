import { Module } from '@nestjs/common';
import { ShiftsModule } from './shifts/shifts.module';
import { ShiftAssignmentsModule } from './shift-assignments/shift-assignments.module';

@Module({
  imports: [ShiftsModule, ShiftAssignmentsModule],
  exports: [ShiftsModule, ShiftAssignmentsModule],
})
export class ShiftModule {}
