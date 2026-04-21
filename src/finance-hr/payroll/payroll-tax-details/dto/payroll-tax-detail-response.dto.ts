import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class PayrollTaxDetailResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  id: number;

  @ApiProperty({ example: 1, description: 'Payroll entry ID' })
  payroll_entry_id: number;

  @ApiProperty({ example: 'Income tax' })
  tax_type: string;

  @ApiProperty({ example: 19.0 })
  percentage: number;

  @ApiProperty({ example: 15000.5 })
  amount: number;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: string;
}

export class OnePayrollTaxDetailResponseDto extends SuccessResponse {
  @ApiProperty({ type: PayrollTaxDetailResponseDto })
  data: PayrollTaxDetailResponseDto;
}
