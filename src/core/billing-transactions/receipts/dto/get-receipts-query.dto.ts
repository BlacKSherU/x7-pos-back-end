import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

import { ReceiptType } from '../constants/receipt-type.enum';
import { ReceiptStatusFilter } from '../constants/receipt-status-filter.enum';
import { ReceiptDateRangeQueryDto } from './receipt-date-range-query.dto';

export enum ReceiptSortBy {
  CREATED_AT = 'createdAt',
  TYPE = 'type',
  INVOICE_NUMBER = 'invoiceNumber',
  GRAND_TOTAL = 'grandTotal',
}

export class GetReceiptsQueryDto extends ReceiptDateRangeQueryDto {
  @ApiPropertyOptional({ example: 200 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  orderId?: number;

  @ApiPropertyOptional({ example: ReceiptType.INVOICE, enum: ReceiptType })
  @IsOptional()
  @IsEnum(ReceiptType)
  type?: ReceiptType;

  @ApiPropertyOptional({
    example: 'INV-0001',
    description:
      'Alphanumeric search (case-insensitive, partial match) over invoice_number and fiscal_data',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({
    enum: ReceiptStatusFilter,
    default: ReceiptStatusFilter.ACTIVE,
    description:
      'is_active filter: active (default), inactive (logically deleted) or all',
  })
  @IsOptional()
  @IsEnum(ReceiptStatusFilter)
  status?: ReceiptStatusFilter;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ enum: ReceiptSortBy })
  @IsOptional()
  @IsEnum(ReceiptSortBy)
  sortBy?: ReceiptSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'DESC' })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
