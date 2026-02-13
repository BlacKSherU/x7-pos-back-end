import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipPoolMembersService } from './tip-pool-members.service';
import { TipPoolMembersController } from './tip-pool-members.controller';
import { TipPoolMember } from './entities/tip-pool-member.entity';
import { TipPool } from '../tip-pools/entities/tip-pool.entity';
import { Collaborator } from '../../collaborators/entities/collaborator.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipPoolMember, TipPool, Collaborator]),
  ],
  controllers: [TipPoolMembersController],
  providers: [TipPoolMembersService],
  exports: [TipPoolMembersService],
})
export class TipPoolMembersModule {}
