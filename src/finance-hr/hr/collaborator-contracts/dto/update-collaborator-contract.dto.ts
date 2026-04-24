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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContractType } from '../constants/contract-type.enum';

export class UpdateCollaboratorContractDto {
  @ApiPropertyOptional({ example: 1, description: 'Company ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  company_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Merchant ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  merchant_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Collaborator ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  collaborator_id?: number;

  @ApiPropertyOptional({
    example: ContractType.HOURLY,
    enum: ContractType,
    description: 'Type of contract',
  })
  @IsOptional()
  @IsEnum(ContractType)
  contract_type?: ContractType;

  @ApiPropertyOptional({ example: 500000, description: 'Base salary' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  base_salary?: number;

  @ApiPropertyOptional({ example: 5000, description: 'Hourly rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourly_rate?: number;

  @ApiPropertyOptional({ example: 1.5, description: 'Overtime multiplier' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  overtime_multiplier?: number;

  @ApiPropertyOptional({
    example: 2.0,
    description: 'Double overtime multiplier',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  double_overtime_multiplier?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Tips included in payroll',
  })
  @IsOptional()
  @IsBoolean()
  tips_included_in_payroll?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Contract active' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: '2024-01-01', description: 'Start date' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ example: '2025-12-31', description: 'End date' })
  @IsOptional()
  @IsDateString()
  end_date?: string | null;
}
