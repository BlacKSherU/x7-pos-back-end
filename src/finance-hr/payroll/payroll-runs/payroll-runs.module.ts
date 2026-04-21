import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollRunsService } from './payroll-runs.service';
import { PayrollRunsController } from './payroll-runs.controller';
import { PayrollRun } from './entities/payroll-run.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PayrollRun, Company, Merchant])],
  controllers: [PayrollRunsController],
  providers: [PayrollRunsService],
  exports: [PayrollRunsService],
})
export class PayrollRunsModule {}
