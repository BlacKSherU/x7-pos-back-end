import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TipPoolMembersService } from './tip-pool-members.service';
import { TipPoolMembersController } from './tip-pool-members.controller';
import { TipPoolMember } from './entities/tip-pool-member.entity';
import { TipPool } from '../tip-pools/entities/tip-pool.entity';
import { Collaborator } from 'src/finance-hr/hr/collaborators/entities/collaborator.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([TipPoolMember, TipPool, Collaborator])],
  controllers: [TipPoolMembersController],
  providers: [TipPoolMembersService],
  exports: [TipPoolMembersService],
})
export class TipPoolMembersModule {}
