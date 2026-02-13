import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipPoolsService } from './tip-pools.service';
import { TipPoolsController } from './tip-pools.controller';
import { TipPool } from './entities/tip-pool.entity';
import { Company } from '../../companies/entities/company.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Shift } from '../../shifts/entities/shift.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TipPool, Company, Merchant, Shift]),
  ],
  controllers: [TipPoolsController],
  providers: [TipPoolsService],
  exports: [TipPoolsService],
})
export class TipPoolsModule {}
