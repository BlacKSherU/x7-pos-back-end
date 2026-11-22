import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { InventoryDeductionStatus } from '../constants/inventory-deduction-status.enum';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class GetInventorySyncQueryDto {
  @ApiPropertyOptional({
    example: 'INV-000012',
    description: 'Receipt invoice number (partial, case-insensitive match)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: 12, description: 'Receipt ID' })
  @IsOptional()
  @IsInt()
  @Min(1)
  receiptId?: number;

  @ApiPropertyOptional({
    example: 'BURGER-01',
    description: 'Receipt line SKU (partial, case-insensitive match)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({
    enum: InventoryDeductionStatus,
    description:
      'Stock deduction status. The status is computed, so only the most recent 2000 matching receipt lines are scanned when it is set.',
  })
  @IsOptional()
  @IsEnum(InventoryDeductionStatus)
  status?: InventoryDeductionStatus;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Receipts created on or after this date (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'dateFrom must be a YYYY-MM-DD date' })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Receipts created on or before this date (YYYY-MM-DD)',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'dateTo must be a YYYY-MM-DD date' })
  dateTo?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
