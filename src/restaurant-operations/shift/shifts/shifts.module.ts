import { Module } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { ShiftsController } from './shifts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shift } from './entities/shift.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { ShiftAssignment } from '../shift-assignments/entities/shift-assignment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Shift, Merchant, ShiftAssignment])],
  controllers: [ShiftsController],
  providers: [ShiftsService],
  exports: [ShiftsService],
})
export class ShiftsModule {}
