import {
  IsNumber,
  IsPositive,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType } from '../constants/contract-type.enum';

export class CreateCollaboratorContractDto {
  @ApiProperty({ example: 1, description: 'Company ID' })
  @IsNumber()
  @IsPositive()
  company_id: number;

  @ApiProperty({ example: 1, description: 'Merchant ID' })
  @IsNumber()
  @IsPositive()
  merchant_id: number;

  @ApiProperty({ example: 1, description: 'Collaborator ID' })
  @IsNumber()
  @IsPositive()
  collaborator_id: number;

  @ApiProperty({
    example: ContractType.HOURLY,
    enum: ContractType,
    description: 'Type of contract: hourly, salary, or mixed',
  })
  @IsEnum(ContractType)
  contract_type: ContractType;

  @ApiPropertyOptional({
    example: 500000,
    description: 'Base salary (for salary/mixed)',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  base_salary?: number;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Hourly rate (for hourly/mixed)',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourly_rate?: number;

  @ApiPropertyOptional({
    example: 1.5,
    description: 'Overtime multiplier',
    default: 1.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  overtime_multiplier?: number;

  @ApiPropertyOptional({
    example: 2.0,
    description: 'Double overtime multiplier',
    default: 2.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  double_overtime_multiplier?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether tips are included in payroll',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  tips_included_in_payroll?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether the contract is active. Optional; defaults to true when creating.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiProperty({ example: '2024-01-01', description: 'Contract start date' })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({
    example: '2025-12-31',
    description: 'Contract end date',
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;
}
