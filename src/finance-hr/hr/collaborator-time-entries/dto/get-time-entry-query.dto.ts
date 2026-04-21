import {
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetTimeEntryQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by company ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  company_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by merchant ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  merchant_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by collaborator ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  collaborator_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by shift ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  shift_id?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Filter by approved status',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  approved?: boolean;

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'From date (clock_in >= date)',
  })
  @IsOptional()
  @IsDateString()
  from_date?: string;

  @ApiPropertyOptional({
    example: '2024-01-31',
    description: 'To date (clock_in <= date)',
  })
  @IsOptional()
  @IsDateString()
  to_date?: string;
}
