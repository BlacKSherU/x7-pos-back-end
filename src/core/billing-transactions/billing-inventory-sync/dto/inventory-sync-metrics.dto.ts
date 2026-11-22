import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import {
  InventoryComponentKind,
  InventoryDeductionStatus,
} from '../constants/inventory-deduction-status.enum';
import { StockLevel } from '../constants/stock-availability-status.enum';
import { InventorySyncLocationDto } from './inventory-sync-row.dto';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class GetInventorySyncMetricsQueryDto {
  @ApiPropertyOptional({
    example: '2026-11-16',
    description:
      'Window start (YYYY-MM-DD). Defaults to 6 days before dateTo (a 7-day window).',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'dateFrom must be a YYYY-MM-DD date' })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-11-22',
    description: 'Window end, inclusive (YYYY-MM-DD). Defaults to today (UTC).',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: 'dateTo must be a YYYY-MM-DD date' })
  dateTo?: string;
}

export class InventorySyncStatusCountsDto {
  @ApiProperty({ example: 120 })
  DEDUCTED: number;

  @ApiProperty({ example: 8 })
  PENDING: number;

  @ApiProperty({ example: 3 })
  INSUFFICIENT_STOCK: number;

  @ApiProperty({ example: 1 })
  FAILED: number;

  @ApiProperty({ example: 14 })
  NOT_TRACKED: number;
}

export class LowStockWarningDto {
  @ApiProperty({ example: 46 })
  stockItemId: number;

  @ApiProperty({ example: 'Cola 355ml' })
  name: string;

  @ApiPropertyOptional({ example: 'COLA', nullable: true })
  sku: string | null;

  @ApiProperty({ enum: InventoryComponentKind })
  kind: InventoryComponentKind;

  @ApiProperty({ example: 3 })
  locationId: number;

  @ApiPropertyOptional({ example: 'Main kitchen', nullable: true })
  locationName: string | null;

  @ApiProperty({ example: 2 })
  currentQty: number;

  @ApiPropertyOptional({ example: 6, nullable: true })
  minimumQty: number | null;

  @ApiProperty({ enum: [StockLevel.LOW, StockLevel.OUT_OF_STOCK] })
  level: StockLevel;

  @ApiProperty({
    example: 14,
    description: 'Units deducted by sales (OUT_FOR_SALE) in the window',
  })
  soldQty: number;

  @ApiProperty({ example: '2026-11-22T13:40:00.000Z' })
  lastSaleAt: Date;

  @ApiPropertyOptional({
    example: 31,
    nullable: true,
    description: 'Active inventory stock alert of the item, if any',
  })
  alertId: number | null;
}

export class LowStockSummaryDto {
  @ApiProperty({
    example: 4,
    description:
      'Stock items deducted by sales in the window that are now low or out of stock',
  })
  total: number;

  @ApiProperty({ example: 1 })
  outOfStock: number;

  @ApiProperty({ example: 3 })
  low: number;

  @ApiProperty({
    example: 2,
    description: 'Active inventory stock alerts among those items',
  })
  activeAlerts: number;

  @ApiProperty({
    type: [LowStockWarningDto],
    description: 'Most critical items first (out of stock, then lowest stock)',
  })
  warnings: LowStockWarningDto[];
}

export class InventorySyncMetricsDto {
  @ApiProperty({ example: '2026-11-16' })
  dateFrom: string;

  @ApiProperty({ example: '2026-11-22' })
  dateTo: string;

  @ApiProperty({ example: '2026-11-22T14:00:00.000Z' })
  generatedAt: Date;

  @ApiPropertyOptional({ type: InventorySyncLocationDto, nullable: true })
  salesLocation: InventorySyncLocationDto | null;

  @ApiProperty({ example: 146, description: 'Receipt lines evaluated' })
  linesEvaluated: number;

  @ApiProperty({
    example: false,
    description:
      'True when the window has more receipt lines than the scan limit (2000 most recent)',
  })
  scanLimitReached: boolean;

  @ApiProperty({
    example: 123,
    description: 'Receipt lines whose stock was deducted',
  })
  itemsDeducted: number;

  @ApiProperty({ example: 180, description: 'Units sold on those lines' })
  unitsDeducted: number;

  @ApiProperty({ type: InventorySyncStatusCountsDto })
  statusCounts: Record<InventoryDeductionStatus, number>;

  @ApiProperty({ type: LowStockSummaryDto })
  lowStock: LowStockSummaryDto;
}

export class OneInventorySyncMetricsResponse extends SuccessResponse {
  @ApiProperty({ type: InventorySyncMetricsDto })
  data: InventorySyncMetricsDto;
}
