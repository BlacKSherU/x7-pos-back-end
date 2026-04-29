import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TipPoolsService } from './tip-pools.service';
import { TipPoolsController } from './tip-pools.controller';
import { TipPool } from './entities/tip-pool.entity';
import { Company } from '../../../platform-saas/companies/entities/company.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Shift } from '../../shift/shifts/entities/shift.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([TipPool, Company, Merchant, Shift])],
  controllers: [TipPoolsController],
  providers: [TipPoolsService],
  exports: [TipPoolsService],
})
export class TipPoolsModule {}
