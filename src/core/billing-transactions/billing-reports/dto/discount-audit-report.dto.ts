import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReceiptType } from '../../receipts/constants/receipt-type.enum';
import { DiscountAuditEventType } from './billing-report-query.dto';

export enum DiscountAuditEvent {
  DISCOUNT = 'DISCOUNT',
  VOID = 'VOID',
}

export class DiscountAuditFiltersDto {
  @ApiPropertyOptional({ example: '2026-01-01', nullable: true })
  from: string | null;

  @ApiPropertyOptional({ example: '2026-01-31', nullable: true })
  to: string | null;

  @ApiProperty({ enum: DiscountAuditEventType })
  event_type: DiscountAuditEventType;

  @ApiPropertyOptional({ example: 7, nullable: true })
  user_id: number | null;

  @ApiPropertyOptional({ enum: ReceiptType, nullable: true })
  receipt_type: ReceiptType | null;

  @ApiPropertyOptional({ example: 'USD', nullable: true })
  currency: string | null;
}

/** Datos de `order_snapshot` resumidos para la tabla y el CSV. */
export class OrderSnapshotSummaryDto {
  @ApiPropertyOptional({ example: 200, nullable: true })
  order_id: number | null;

  @ApiPropertyOptional({ example: 'ORD-000200', nullable: true })
  order_number: string | null;

  @ApiProperty({ example: 3 })
  item_count: number;

  @ApiProperty({ example: '2 x Burger Combo; 1 x Soda' })
  items_summary: string;

  @ApiProperty({ example: 'cash, card' })
  payment_methods: string;

  @ApiPropertyOptional({ example: 25, nullable: true })
  subtotal: number | null;

  @ApiPropertyOptional({ example: 2.5, nullable: true })
  discount_total: number | null;

  @ApiPropertyOptional({ example: 27.25, nullable: true })
  total: number | null;
}

export class DiscountAuditRowDto {
  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiPropertyOptional({ example: 'INV-000010', nullable: true })
  invoice_number: string | null;

  @ApiProperty({ enum: ReceiptType })
  receipt_type: ReceiptType;

  @ApiProperty({ example: 200 })
  order_id: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: '2026-01-15T08:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2026-01-15T09:00:00.000Z' })
  updated_at: string;

  @ApiProperty({ example: true })
  is_active: boolean;

  @ApiProperty({ example: false })
  is_locked: boolean;

  @ApiProperty({
    enum: DiscountAuditEvent,
    isArray: true,
    example: [DiscountAuditEvent.DISCOUNT],
  })
  events: DiscountAuditEvent[];

  @ApiPropertyOptional({ example: 7, nullable: true })
  processed_by_user_id: number | null;

  @ApiPropertyOptional({ example: 'merchant_user', nullable: true })
  processed_by_role: string | null;

  @ApiPropertyOptional({ example: 'cashier_ana', nullable: true })
  processed_by_name: string | null;

  @ApiProperty({
    example: 25,
    description: 'Receipt subtotal before tax and discount.',
  })
  original_subtotal: number;

  @ApiProperty({ example: 2.5 })
  discount_applied: number;

  @ApiPropertyOptional({
    example: 10,
    nullable: true,
    description: 'discount_applied / original_subtotal * 100.',
  })
  discount_pct: number | null;

  @ApiProperty({ example: 4.75 })
  total_tax: number;

  @ApiProperty({
    example: 27.25,
    description: 'grand_total = subtotal + tax - discount.',
  })
  final_total: number;

  @ApiPropertyOptional({ type: () => OrderSnapshotSummaryDto, nullable: true })
  snapshot: OrderSnapshotSummaryDto | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Raw order_snapshot JSON stored with the receipt.',
  })
  order_snapshot: Record<string, unknown> | null;
}

export class DiscountAuditCurrencySummaryDto {
  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 12 })
  receipts: number;

  @ApiProperty({ example: 350.5 })
  original_subtotal: number;

  @ApiProperty({ example: 35.05 })
  discount_applied: number;

  @ApiProperty({ example: 42.1 })
  total_tax: number;

  @ApiProperty({ example: 357.55 })
  final_total: number;
}

export class DiscountAuditSummaryDto {
  @ApiProperty({ example: 12, description: 'Receipts matching the filters.' })
  receipts: number;

  @ApiProperty({ example: 9, description: 'Receipts with total_discount > 0.' })
  discounted_receipts: number;

  @ApiProperty({ example: 3, description: 'Receipts with is_active = false.' })
  voided_receipts: number;

  @ApiProperty({ type: () => [DiscountAuditCurrencySummaryDto] })
  by_currency: DiscountAuditCurrencySummaryDto[];
}

export class DiscountAuditReportResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [DiscountAuditRowDto] })
  data: DiscountAuditRowDto[];

  @ApiProperty({ type: () => DiscountAuditSummaryDto })
  summary: DiscountAuditSummaryDto;

  @ApiProperty({ type: () => DiscountAuditFiltersDto })
  filters: DiscountAuditFiltersDto;

  @ApiProperty({ example: '2026-02-01T10:00:00.000Z' })
  generated_at: string;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 50 })
  limit: number;

  @ApiProperty({ example: 12 })
  total: number;

  @ApiProperty({ example: 1 })
  totalPages: number;

  @ApiProperty({ example: false })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;
}
