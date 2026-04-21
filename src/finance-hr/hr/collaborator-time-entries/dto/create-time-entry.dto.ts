import {
  IsNumber,
  IsPositive,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTimeEntryDto {
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

  @ApiProperty({ example: 1, description: 'Shift ID' })
  @IsNumber()
  @IsPositive()
  shift_id: number;

  @ApiProperty({
    example: '2024-01-15T08:00:00.000Z',
    description: 'Clock in timestamp',
  })
  @IsDateString()
  clock_in: string;

  @ApiPropertyOptional({
    example: '2024-01-15T16:00:00.000Z',
    description: 'Clock out timestamp',
  })
  @IsOptional()
  @IsDateString()
  clock_out?: string | null;

  @ApiPropertyOptional({ example: 8, description: 'Regular hours', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  regular_hours?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Overtime hours',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overtime_hours?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Double overtime hours',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  double_overtime_hours?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Approved',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  approved?: boolean;
}
