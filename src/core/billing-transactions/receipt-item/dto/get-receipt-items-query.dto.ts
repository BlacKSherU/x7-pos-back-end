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

export enum ReceiptItemSortBy {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  TOTAL = 'total',
}

/**
 * Logical status filter. A string (not a boolean) on purpose: with the global
 * `enableImplicitConversion`, `?isActive=false` would become `Boolean('false') === true`.
 */
export const RECEIPT_ITEM_STATUS_FILTERS = ['true', 'false', 'all'] as const;
export type ReceiptItemStatusFilter =
  (typeof RECEIPT_ITEM_STATUS_FILTERS)[number];

export class GetReceiptItemsQueryDto {
  @ApiPropertyOptional({ example: 10, description: 'Filter by receipt ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receiptId?: number;

  @ApiPropertyOptional({
    example: 'burger',
    description:
      'Free-text search over the item description (name) OR the SKU (partial, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @ApiPropertyOptional({
    example: 'Burger',
    description: 'Filter by item name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'SKU-001',
    description: 'Item selector: exact SKU (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({
    example: 'Burger Combo',
    description:
      'Item selector for lines without SKU: exact item name (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  itemName?: string;

  @ApiPropertyOptional({
    enum: RECEIPT_ITEM_STATUS_FILTERS,
    default: 'true',
    description:
      "Logical status: 'true' = active lines (default), 'false' = logically deleted lines, 'all' = both",
  })
  @IsOptional()
  @IsIn(RECEIPT_ITEM_STATUS_FILTERS)
  isActive?: ReceiptItemStatusFilter;

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

  @ApiPropertyOptional({ enum: ReceiptItemSortBy })
  @IsOptional()
  @IsEnum(ReceiptItemSortBy)
  sortBy?: ReceiptItemSortBy;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], example: 'ASC' })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';
}
