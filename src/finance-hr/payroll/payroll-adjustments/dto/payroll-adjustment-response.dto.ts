import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { AdjustmentType } from '../constants/adjustment-type.enum';

export class PayrollAdjustmentResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  id: number;

  @ApiProperty({ example: 1, description: 'Payroll entry ID' })
  payroll_entry_id: number;

  @ApiProperty({ example: AdjustmentType.BONUS, enum: AdjustmentType })
  adjustment_type: AdjustmentType;

  @ApiProperty({ example: 'Performance bonus', nullable: true })
  description: string | null;

  @ApiProperty({ example: 150.5 })
  amount: number;

  @ApiProperty({ description: 'Creation timestamp' })
  created_at: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updated_at: string;
}

export class OnePayrollAdjustmentResponseDto extends SuccessResponse {
  @ApiProperty({ type: PayrollAdjustmentResponseDto })
  data: PayrollAdjustmentResponseDto;
}
