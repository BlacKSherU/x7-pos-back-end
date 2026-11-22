import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNumber, IsOptional, Min } from 'class-validator';
import { ReceiptTaxFiltersDto } from './receipt-tax-filters.dto';

export enum ReceiptTaxSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  AMOUNT = 'amount',
  RATE = 'rate',
}

export const RECEIPT_TAX_STATUS_FILTERS = [
  'active',
  'inactive',
  'all',
] as const;
export type ReceiptTaxStatusFilter =
  (typeof RECEIPT_TAX_STATUS_FILTERS)[number];

export class GetReceiptTaxesQueryDto extends ReceiptTaxFiltersDto {
  @ApiPropertyOptional({
    enum: RECEIPT_TAX_STATUS_FILTERS,
    default: 'active',
    description:
      'active (default): only taxes counted in receipt totals; inactive: deactivated taxes; all: both',
  })
  @IsOptional()
  @IsIn(RECEIPT_TAX_STATUS_FILTERS)
  status?: ReceiptTaxStatusFilter;

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, description: 'Items per page' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: ReceiptTaxSortBy })
  @IsOptional()
  @IsEnum(ReceiptTaxSortBy)
  sortBy?: ReceiptTaxSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'ASC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
