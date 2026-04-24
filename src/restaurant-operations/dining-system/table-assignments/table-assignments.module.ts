import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TableAssignmentsService } from './table-assignments.service';
import { TableAssignmentsController } from './table-assignments.controller';
import { TableAssignment } from './entities/table-assignment.entity';
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';
import { Table } from '../tables/entities/table.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([TableAssignment, Shift, Table, Collaborator]),
  ],
  controllers: [TableAssignmentsController],
  providers: [TableAssignmentsService],
  exports: [TableAssignmentsService],
})
export class TableAssignmentsModule {}
