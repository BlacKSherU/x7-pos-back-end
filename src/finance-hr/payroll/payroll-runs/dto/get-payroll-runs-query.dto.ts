import {
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PayrollRunStatus } from '../constants/payroll-run-status.enum';

export enum PayrollRunSortBy {
  CREATED_AT = 'created_at',
  PERIOD_START = 'period_start',
  PERIOD_END = 'period_end',
  STATUS = 'status',
}

export class GetPayrollRunsQueryDto {
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
  @IsPositive()
  company_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by merchant ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  merchant_id?: number;

  @ApiPropertyOptional({
    example: PayrollRunStatus.DRAFT,
    enum: PayrollRunStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(PayrollRunStatus)
  status?: PayrollRunStatus;

  @ApiPropertyOptional({
    example: PayrollRunSortBy.CREATED_AT,
    enum: PayrollRunSortBy,
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(PayrollRunSortBy)
  sortBy?: PayrollRunSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
