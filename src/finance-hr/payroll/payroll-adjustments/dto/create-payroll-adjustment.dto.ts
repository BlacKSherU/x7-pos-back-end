import {
  IsNumber,
  IsPositive,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdjustmentType } from '../constants/adjustment-type.enum';

export class CreatePayrollAdjustmentDto {
  @ApiProperty({ example: 1, description: 'Payroll entry ID' })
  @IsNumber()
  @IsPositive()
  payroll_entry_id: number;

  @ApiProperty({
    example: AdjustmentType.BONUS,
    enum: AdjustmentType,
    description: 'Type of adjustment: bonus or deduction',
  })
  @IsEnum(AdjustmentType)
  adjustment_type: AdjustmentType;

  @ApiPropertyOptional({
    example: 'Performance bonus Q1',
    description: 'Description of the adjustment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    example: 150.5,
    description:
      'Adjustment amount (positive for bonus, negative for deduction)',
  })
  @IsNumber()
  @Min(-999999999.99, { message: 'amount must be at least -999999999.99' })
  amount: number;
}
