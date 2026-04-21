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

export enum PayrollTaxDetailSortBy {
  CREATED_AT = 'created_at',
  AMOUNT = 'amount',
  PERCENTAGE = 'percentage',
  TAX_TYPE = 'tax_type',
}

export class GetPayrollTaxDetailsQueryDto {
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
    example: PayrollTaxDetailSortBy.CREATED_AT,
    enum: PayrollTaxDetailSortBy,
    description: 'Sort field',
  })
  @IsOptional()
  @IsEnum(PayrollTaxDetailSortBy)
  sortBy?: PayrollTaxDetailSortBy;

  @ApiPropertyOptional({
    example: 'DESC',
    enum: ['ASC', 'DESC'],
    description: 'Sort order',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
