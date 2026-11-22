import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReceiptType } from '../../receipts/constants/receipt-type.enum';
import {
  InventoryComponentKind,
  InventoryDeductionStatus,
  InventorySkuMappingSource,
} from '../constants/inventory-deduction-status.enum';

export class InventorySyncLocationDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'Main kitchen' })
  name: string;

  @ApiPropertyOptional({ example: 'MAIN-01', nullable: true })
  code: string | null;
}

export class InventorySyncMovementDto {
  @ApiProperty({ example: 120 })
  id: number;

  @ApiProperty({ example: 45 })
  stockItemId: number;

  @ApiProperty({
    example: 4,
    description:
      'Quantity of the movement (the deduction aggregates the whole order per stock item)',
  })
  quantity: number;

  @ApiProperty({ example: 'OUT_FOR_SALE' })
  type: string;

  @ApiPropertyOptional({ example: 'order:42', nullable: true })
  reference: string | null;

  @ApiProperty({ example: '2026-11-20T15:04:05.000Z' })
  createdAt: Date;

  @ApiPropertyOptional({ example: 3, nullable: true })
  locationId: number | null;

  @ApiPropertyOptional({ example: 'Main kitchen', nullable: true })
  locationName: string | null;
}

export class InventorySyncComponentDto {
  @ApiProperty({ example: 'supply:7' })
  key: string;

  @ApiProperty({ enum: InventoryComponentKind })
  kind: InventoryComponentKind;

  @ApiProperty({ example: 'Beef patty' })
  name: string;

  @ApiPropertyOptional({ example: 'RM-BEEF', nullable: true })
  sku: string | null;

  @ApiProperty({
    example: 2,
    description: 'Stock units this receipt line consumes',
  })
  requiredQty: number;

  @ApiProperty({
    example: 4,
    description: 'Quantity moved for the whole order on this stock item',
  })
  deductedQty: number;

  @ApiProperty({ example: [120], type: [Number] })
  movementIds: number[];

  @ApiPropertyOptional({ example: 45, nullable: true })
  stockItemId: number | null;

  @ApiPropertyOptional({
    example: 18,
    nullable: true,
    description: 'Current on-hand quantity of the stock item',
  })
  currentQty: number | null;

  @ApiPropertyOptional({ example: 10, nullable: true })
  minimumQty: number | null;

  @ApiPropertyOptional({ example: 3, nullable: true })
  locationId: number | null;

  @ApiPropertyOptional({ example: 'Main kitchen', nullable: true })
  locationName: string | null;

  @ApiProperty({
    example: 0,
    description: 'Missing units (pending) or negative stock left (deducted)',
  })
  shortfall: number;

  @ApiProperty({ example: false })
  insufficient: boolean;
}

export class InventorySyncRowDto {
  @ApiProperty({ example: 31 })
  receiptItemId: number;

  @ApiProperty({ example: 12 })
  receiptId: number;

  @ApiPropertyOptional({ example: 'INV-000012', nullable: true })
  invoiceNumber: string | null;

  @ApiProperty({ enum: ReceiptType })
  receiptType: ReceiptType;

  @ApiProperty({ example: '2026-11-20T15:00:00.000Z' })
  receiptCreatedAt: Date;

  @ApiProperty({ example: 42 })
  orderId: number;

  @ApiPropertyOptional({ example: '000042', nullable: true })
  orderNumber: string | null;

  @ApiProperty({ example: true })
  orderPaid: boolean;

  @ApiPropertyOptional({ example: '2026-11-20T15:04:05.000Z', nullable: true })
  inventoryConsumedAt: Date | null;

  @ApiPropertyOptional({ example: 'BURGER-01', nullable: true })
  sku: string | null;

  @ApiProperty({ example: 'Classic burger' })
  itemName: string;

  @ApiProperty({ example: 2 })
  quantitySold: number;

  @ApiPropertyOptional({ enum: InventorySkuMappingSource, nullable: true })
  mappingSource: InventorySkuMappingSource | null;

  @ApiPropertyOptional({ example: 8, nullable: true })
  productId: number | null;

  @ApiPropertyOptional({ example: 'Classic burger', nullable: true })
  productName: string | null;

  @ApiPropertyOptional({ example: 14, nullable: true })
  variantId: number | null;

  @ApiPropertyOptional({ example: 'Double', nullable: true })
  variantName: string | null;

  @ApiPropertyOptional({
    type: InventorySyncLocationDto,
    nullable: true,
    description:
      'Warehouse the stock was deducted from, or the default sales location while pending',
  })
  location: InventorySyncLocationDto | null;

  @ApiProperty({ type: [InventorySyncMovementDto] })
  movements: InventorySyncMovementDto[];

  @ApiProperty({ type: [InventorySyncComponentDto] })
  components: InventorySyncComponentDto[];

  @ApiProperty({ enum: InventoryDeductionStatus })
  deductionStatus: InventoryDeductionStatus;

  @ApiProperty({ example: true })
  deducted: boolean;

  @ApiProperty({
    example: false,
    description: 'Highlight: insufficient or negative stock',
  })
  insufficientStock: boolean;

  @ApiProperty({
    example: false,
    description: 'Highlight: the inventory commit failed or is incomplete',
  })
  commitFailed: boolean;

  @ApiProperty({ example: 'Stock deducted for order #000042 (2 movements).' })
  statusReason: string;
}

export class AllPaginatedInventorySyncRows extends SuccessResponse {
  @ApiProperty({ type: [InventorySyncRowDto] })
  data: InventorySyncRowDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 25 })
  total: number;

  @ApiProperty({ example: 3 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}
