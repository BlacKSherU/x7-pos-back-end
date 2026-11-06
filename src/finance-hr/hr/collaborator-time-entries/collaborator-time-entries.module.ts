import { Module } from '@nestjs/common';
import { TimeEntryRevision } from './entities/time-entry-revision.entity';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { CollaboratorTimeEntriesService } from './collaborator-time-entries.service';
import { CollaboratorTimeEntriesController } from './collaborator-time-entries.controller';
import { AttendanceController } from './attendance.controller';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      // Unchanging historical record of transfer corrections.
      TimeEntryRevision,
      TimeEntry,
      Company,
      Merchant,
      Collaborator,
      Shift,
    ]),
  ],
  controllers: [CollaboratorTimeEntriesController, AttendanceController],
  providers: [CollaboratorTimeEntriesService],
  exports: [CollaboratorTimeEntriesService],
})
export class CollaboratorTimeEntriesModule {}
