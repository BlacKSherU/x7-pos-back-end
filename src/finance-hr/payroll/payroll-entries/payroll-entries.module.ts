import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollEntriesService } from './payroll-entries.service';
import { PayrollEntriesController } from './payroll-entries.controller';
import { PayrollEntry } from './entities/payroll-entry.entity';
import { PayrollRun } from '../payroll-runs/entities/payroll-run.entity';
import { Collaborator } from '../../hr/collaborators/entities/collaborator.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PayrollEntry, PayrollRun, Collaborator])],
  controllers: [PayrollEntriesController],
  providers: [PayrollEntriesService],
  exports: [PayrollEntriesService],
})
export class PayrollEntriesModule {}
