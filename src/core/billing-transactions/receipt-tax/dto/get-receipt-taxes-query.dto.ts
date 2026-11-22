import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';

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

export class GetReceiptTaxesQueryDto {
  @ApiPropertyOptional({ example: 10, description: 'Filter by receipt ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receiptId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Filter by receipt item ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receiptItemId?: number;

  @ApiPropertyOptional({
    enum: ReceiptTaxScope,
    description: 'Filter by scope',
  })
  @IsOptional()
  @IsEnum(ReceiptTaxScope)
  scope?: ReceiptTaxScope;

  @ApiPropertyOptional({
    example: 'IVA',
    description: 'Filter by tax name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;

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
