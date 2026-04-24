import { PartialType } from '@nestjs/swagger';
import { CreatePayrollTaxDetailDto } from './create-payroll-tax-detail.dto';

export class UpdatePayrollTaxDetailDto extends PartialType(
  CreatePayrollTaxDetailDto,
) {}
