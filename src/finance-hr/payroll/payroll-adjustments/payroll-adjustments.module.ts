import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollAdjustmentsService } from './payroll-adjustments.service';
import { PayrollAdjustmentsController } from './payroll-adjustments.controller';
import { PayrollAdjustment } from './entities/payroll-adjustment.entity';
import { PayrollEntry } from '../payroll-entries/entities/payroll-entry.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([PayrollAdjustment, PayrollEntry])],
  controllers: [PayrollAdjustmentsController],
  providers: [PayrollAdjustmentsService],
  exports: [PayrollAdjustmentsService],
})
export class PayrollAdjustmentsModule {}
