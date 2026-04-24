import {
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum PayrollEntrySortBy {
  CREATED_AT = 'created_at',
  NET_TOTAL = 'net_total',
  GROSS_TOTAL = 'gross_total',
  COLLABORATOR_ID = 'collaborator_id',
}

export class GetPayrollEntriesQueryDto {
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

  @ApiPropertyOptional({ example: 1, description: 'Filter by payroll run ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  payroll_run_id?: number;

  @ApiPropertyOptional({ example: 1, description: 'Filter by collaborator ID' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  collaborator_id?: number;

  @ApiPropertyOptional({
    example: PayrollEntrySortBy.CREATED_AT,
    enum: PayrollEntrySortBy,
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(PayrollEntrySortBy)
  sortBy?: PayrollEntrySortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
