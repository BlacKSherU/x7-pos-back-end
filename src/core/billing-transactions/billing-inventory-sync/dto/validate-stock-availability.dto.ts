import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import {
  InventoryComponentKind,
  InventorySkuMappingSource,
} from '../constants/inventory-deduction-status.enum';
import { StockAvailabilityStatus } from '../constants/stock-availability-status.enum';
import { InventorySyncLocationDto } from './inventory-sync-row.dto';

export class ValidateStockItemDto {
  @ApiProperty({ example: 'BURGER-01', description: 'Product or variant SKU' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku: string;

  @ApiProperty({ example: 2, description: 'Units to sell' })
  @IsNumber()
  @IsPositive()
  quantity: number;
}

/** Indicar exactamente uno: `receiptId`, `invoiceNumber` o `items`. */
export class ValidateStockAvailabilityDto {
  @ApiPropertyOptional({
    example: 12,
    description: 'Validate the lines of this receipt',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  receiptId?: number;

  @ApiPropertyOptional({
    example: 'INV-000012',
    description:
      'Validate the lines of the receipt with this exact invoice number',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  invoiceNumber?: string;

  @ApiPropertyOptional({
    type: [ValidateStockItemDto],
    description: 'Validate an ad-hoc list of SKUs and quantities (pre-billing)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ValidateStockItemDto)
  items?: ValidateStockItemDto[];

  @ApiPropertyOptional({
    example: 3,
    description:
      'Stock location to check. Defaults to the merchant sales location (the one sales deduct from).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  locationId?: number;
}

export class StockAvailabilityComponentDto {
  @ApiProperty({ example: 'supply:7' })
  key: string;

  @ApiProperty({ enum: InventoryComponentKind })
  kind: InventoryComponentKind;

  @ApiProperty({ example: 'Beef patty' })
  name: string;

  @ApiPropertyOptional({ example: 'RM-BEEF', nullable: true })
  sku: string | null;

  @ApiPropertyOptional({ example: 47, nullable: true })
  stockItemId: number | null;

  @ApiProperty({ example: 4, description: 'Units this line consumes' })
  requiredQty: number;

  @ApiProperty({
    example: 6,
    description: 'Units every validated line consumes from this stock item',
  })
  totalDemand: number;

  @ApiProperty({ example: 18, description: 'Units on hand at the location' })
  availableQty: number;

  @ApiProperty({ example: 12 })
  remainingAfterSale: number;

  @ApiPropertyOptional({ example: 10, nullable: true })
  minimumQty: number | null;

  @ApiProperty({ example: 0 })
  shortfall: number;

  @ApiProperty({
    enum: [
      StockAvailabilityStatus.AVAILABLE,
      StockAvailabilityStatus.LOW_STOCK_AFTER_SALE,
      StockAvailabilityStatus.INSUFFICIENT_STOCK,
    ],
  })
  status: StockAvailabilityStatus;
}

export class StockAvailabilityLineDto {
  @ApiPropertyOptional({
    example: 31,
    nullable: true,
    description: 'Receipt line, when validating a receipt',
  })
  receiptItemId: number | null;

  @ApiPropertyOptional({ example: 'BURGER-01', nullable: true })
  sku: string | null;

  @ApiProperty({ example: 'Classic burger' })
  itemName: string;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiPropertyOptional({ enum: InventorySkuMappingSource, nullable: true })
  mappingSource: InventorySkuMappingSource | null;

  @ApiPropertyOptional({ example: 'Classic burger', nullable: true })
  productName: string | null;

  @ApiPropertyOptional({ example: 'Double', nullable: true })
  variantName: string | null;

  @ApiProperty({ enum: StockAvailabilityStatus })
  status: StockAvailabilityStatus;

  @ApiProperty({ example: 'Enough stock at Main kitchen.' })
  reason: string;

  @ApiProperty({ type: [StockAvailabilityComponentDto] })
  components: StockAvailabilityComponentDto[];
}

export class StockAvailabilitySummaryDto {
  @ApiProperty({ example: 4 })
  lines: number;

  @ApiProperty({ example: 2 })
  available: number;

  @ApiProperty({ example: 1 })
  lowStockAfterSale: number;

  @ApiProperty({ example: 1 })
  insufficientStock: number;

  @ApiProperty({ example: 0 })
  notTracked: number;

  @ApiProperty({ example: 0 })
  alreadyDeducted: number;

  @ApiProperty({ example: 0 })
  locationNotConfigured: number;
}

export class StockAvailabilityResultDto {
  @ApiProperty({ enum: ['RECEIPT', 'ITEMS'] })
  source: 'RECEIPT' | 'ITEMS';

  @ApiPropertyOptional({ example: 12, nullable: true })
  receiptId: number | null;

  @ApiPropertyOptional({ example: 'INV-000012', nullable: true })
  invoiceNumber: string | null;

  @ApiPropertyOptional({ example: 42, nullable: true })
  orderId: number | null;

  @ApiPropertyOptional({ type: InventorySyncLocationDto, nullable: true })
  location: InventorySyncLocationDto | null;

  @ApiProperty({
    example: false,
    description:
      'True when no line lacks stock and the location is known (low stock after the sale still counts as available)',
  })
  allAvailable: boolean;

  @ApiProperty({ type: StockAvailabilitySummaryDto })
  summary: StockAvailabilitySummaryDto;

  @ApiProperty({ type: [StockAvailabilityLineDto] })
  items: StockAvailabilityLineDto[];

  @ApiProperty({ example: '2026-11-22T14:00:00.000Z' })
  checkedAt: Date;
}

export class OneStockAvailabilityResponse extends SuccessResponse {
  @ApiProperty({ type: StockAvailabilityResultDto })
  data: StockAvailabilityResultDto;
}
