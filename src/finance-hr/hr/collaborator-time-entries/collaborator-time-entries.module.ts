import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { CollaboratorTimeEntriesService } from './collaborator-time-entries.service';
import { CollaboratorTimeEntriesController } from './collaborator-time-entries.controller';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { Collaborator } from '../collaborators/entities/collaborator.entity';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeEntry,
      Company,
      Merchant,
      Collaborator,
      Shift,
    ]),
  ],
  controllers: [CollaboratorTimeEntriesController],
  providers: [CollaboratorTimeEntriesService],
  exports: [CollaboratorTimeEntriesService],
})
export class CollaboratorTimeEntriesModule {}
