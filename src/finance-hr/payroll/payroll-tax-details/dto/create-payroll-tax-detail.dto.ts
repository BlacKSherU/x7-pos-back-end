import {
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePayrollTaxDetailDto {
  @ApiProperty({ example: 1, description: 'Payroll entry ID' })
  @IsNumber()
  @IsPositive()
  payroll_entry_id: number;

  @ApiProperty({ example: 'Income tax', description: 'Type of tax' })
  @IsString()
  @MaxLength(100)
  tax_type: string;

  @ApiProperty({ example: 19.0, description: 'Tax percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiProperty({ example: 15000.5, description: 'Tax amount' })
  @IsNumber()
  @Min(0)
  amount: number;
}
