import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TipAllocationsService } from './tip-allocations.service';
import { TipAllocationsController } from './tip-allocations.controller';
import { TipAllocation } from './entities/tip-allocation.entity';
import { Tip } from '../tips/entities/tip.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';
import { Shift } from '../../shift/shifts/entities/shift.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([TipAllocation, Tip, Collaborator, Shift]),
  ],
  controllers: [TipAllocationsController],
  providers: [TipAllocationsService],
  exports: [TipAllocationsService],
})
export class TipAllocationsModule {}
