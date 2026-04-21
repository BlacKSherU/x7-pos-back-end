import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class PayrollEntryResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  id: number;

  @ApiProperty({ example: 1, description: 'Payroll run ID' })
  payroll_run_id: number;

  @ApiProperty({ example: 1, description: 'Collaborator ID' })
  collaborator_id: number;

  @ApiProperty({ example: 50000.0 })
  base_pay: number;

  @ApiProperty({ example: 7500.0 })
  overtime_pay: number;

  @ApiProperty({ example: 0 })
  double_overtime_pay: number;

  @ApiProperty({ example: 15000.0 })
  tips_amount: number;

  @ApiProperty({ example: 5000.0 })
  bonuses: number;

  @ApiProperty({ example: 2000.0 })
  deductions: number;

  @ApiProperty({ example: 75500.0 })
  gross_total: number;

  @ApiProperty({ example: 12000.0 })
  tax_total: number;

  @ApiProperty({ example: 63500.0 })
  net_total: number;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: string;
}

export class OnePayrollEntryResponseDto extends SuccessResponse {
  @ApiProperty({ type: PayrollEntryResponseDto })
  data: PayrollEntryResponseDto;
}
