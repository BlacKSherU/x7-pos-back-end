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
import { AdjustmentType } from '../constants/adjustment-type.enum';

export enum PayrollAdjustmentSortBy {
  CREATED_AT = 'created_at',
  AMOUNT = 'amount',
  ADJUSTMENT_TYPE = 'adjustment_type',
}

export class GetPayrollAdjustmentsQueryDto {
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

  @ApiPropertyOptional({
    example: 1,
    description: 'Filter by payroll entry ID',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  payroll_entry_id?: number;

  @ApiPropertyOptional({
    example: AdjustmentType.BONUS,
    enum: AdjustmentType,
    description: 'Filter by adjustment type',
  })
  @IsOptional()
  @IsEnum(AdjustmentType)
  adjustment_type?: AdjustmentType;

  @ApiPropertyOptional({
    example: PayrollAdjustmentSortBy.CREATED_AT,
    enum: PayrollAdjustmentSortBy,
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(PayrollAdjustmentSortBy)
  sortBy?: PayrollAdjustmentSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
