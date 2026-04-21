import { PartialType } from '@nestjs/swagger';
import { CreatePayrollAdjustmentDto } from './create-payroll-adjustment.dto';

export class UpdatePayrollAdjustmentDto extends PartialType(
  CreatePayrollAdjustmentDto,
) {}
