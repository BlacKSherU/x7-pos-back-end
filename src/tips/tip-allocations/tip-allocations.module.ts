import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipAllocationsService } from './tip-allocations.service';
import { TipAllocationsController } from './tip-allocations.controller';
import { TipAllocation } from './entities/tip-allocation.entity';
import { Tip } from '../tips/entities/tip.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';
import { Shift } from '../../shifts/entities/shift.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipAllocation, Tip, Collaborator, Shift]),
  ],
  controllers: [TipAllocationsController],
  providers: [TipAllocationsService],
  exports: [TipAllocationsService],
})
export class TipAllocationsModule {}
