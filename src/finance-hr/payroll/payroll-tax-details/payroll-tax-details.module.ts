import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollTaxDetailsService } from './payroll-tax-details.service';
import { PayrollTaxDetailsController } from './payroll-tax-details.controller';
import { PayrollTaxDetail } from './entities/payroll-tax-detail.entity';
import { PayrollEntry } from '../payroll-entries/entities/payroll-entry.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([PayrollTaxDetail, PayrollEntry])],
  controllers: [PayrollTaxDetailsController],
  providers: [PayrollTaxDetailsService],
  exports: [PayrollTaxDetailsService],
})
export class PayrollTaxDetailsModule {}
