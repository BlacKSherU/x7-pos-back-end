import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PayrollTaxDetailsService } from './payroll-tax-details.service';
import { PayrollTaxDetailsController } from './payroll-tax-details.controller';
import { PayrollTaxDetail } from './entities/payroll-tax-detail.entity';
import { PayrollEntry } from '../payroll-entries/entities/payroll-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PayrollTaxDetail, PayrollEntry])],
  controllers: [PayrollTaxDetailsController],
  providers: [PayrollTaxDetailsService],
  exports: [PayrollTaxDetailsService],
})
export class PayrollTaxDetailsModule {}
