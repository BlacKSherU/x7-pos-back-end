import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

import { ReceiptType } from '../../receipts/constants/receipt-type.enum';
import {
  PartnerLinkSource,
  PartnerSyncScope,
  PartnerType,
} from '../constants/partner-sync.enums';

export class PartnerSyncMetricsDto {
  @ApiProperty({ enum: PartnerSyncScope, example: PartnerSyncScope.MERCHANT })
  scope: PartnerSyncScope;

  @ApiProperty({
    example: 'USD',
    description: 'Most frequent receipt currency',
  })
  currency: string;

  @ApiProperty({
    example: 42,
    description:
      'Active B2B invoices: active receipts of type INVOICE or explicitly linked to a partner',
  })
  total_b2b_invoices: number;

  @ApiProperty({
    example: 15230.5,
    description: 'Sum of grand_total of B2B invoices',
  })
  b2b_invoiced_amount: number;

  @ApiProperty({
    example: 9,
    description: 'B2B invoices linked explicitly with LINK CUSTOMER PROFILE',
  })
  explicitly_linked_invoices: number;

  @ApiProperty({
    example: 12,
    description:
      'Distinct customers with B2B invoices (explicit link or order customer)',
  })
  linked_customers: number;

  @ApiProperty({
    example: 2,
    description: 'Distinct suppliers with B2B invoices',
  })
  linked_suppliers: number;

  @ApiProperty({
    example: 14,
    description:
      'Active corporate accounts = linked customers + linked suppliers',
  })
  active_corporate_accounts: number;

  @ApiProperty({
    example: 3120.75,
    description: 'Balance still due on the orders behind the B2B invoices',
  })
  outstanding_balance: number;

  @ApiProperty({
    example: 18000,
    description: 'Total billed on the orders behind the B2B invoices',
  })
  billed_amount: number;

  @ApiProperty({
    example: 5,
    description: 'Orders behind B2B invoices with a balance still due',
  })
  open_credit_orders: number;

  @ApiProperty({
    example: 17.34,
    description:
      'Corporate credit utilization (%) = outstanding_balance / billed_amount × 100',
  })
  corporate_credit_utilization: number;
}

export class PartnerSyncMetricsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => PartnerSyncMetricsDto })
  data: PartnerSyncMetricsDto;
}

export class PartnerOptionDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ enum: PartnerType, example: PartnerType.CUSTOMER })
  type: PartnerType;

  @ApiProperty({ example: 'Inversiones Pacifico SpA' })
  name: string;

  @ApiProperty({ example: '77.890.123-4', nullable: true })
  tax_id: string | null;

  @ApiProperty({ example: 'billing@pacifico.cl', nullable: true })
  email: string | null;

  @ApiProperty({
    example: 3,
    nullable: true,
    description:
      'Merchant (branch) that registered the customer; null for suppliers',
  })
  merchant_id: number | null;
}

export class PartnerOptionsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [PartnerOptionDto] })
  data: PartnerOptionDto[];
}

export class PartnerRefDto {
  @ApiProperty({ enum: PartnerType, example: PartnerType.CUSTOMER })
  type: PartnerType;

  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Inversiones Pacifico SpA' })
  name: string;

  @ApiProperty({ example: '77.890.123-4', nullable: true })
  tax_id: string | null;
}

export class OrderCustomerRefDto {
  @ApiProperty({ example: 7 })
  id: number;

  @ApiProperty({ example: 'Walk-in Guest', nullable: true })
  name: string | null;
}

export class PartnerSyncReceiptDto {
  @ApiProperty({ example: 120 })
  id: number;

  @ApiProperty({ example: 'INV-000120', nullable: true })
  invoice_number: string | null;

  @ApiProperty({ enum: ReceiptType, example: ReceiptType.INVOICE })
  type: ReceiptType;

  @ApiProperty({ example: 3 })
  merchant_id: number;

  @ApiProperty({ example: 88 })
  order_id: number;

  @ApiProperty({ example: 250.5 })
  grand_total: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: false })
  is_locked: boolean;

  @ApiProperty({ example: '2026-11-20T15:00:00.000Z' })
  created_at: Date;

  @ApiProperty({
    example: '12345678-9',
    nullable: true,
    description: 'tax_id stored in the receipt fiscal_data JSON',
  })
  fiscal_tax_id: string | null;

  @ApiProperty({
    example: '12345678-9',
    nullable: true,
    description:
      'fiscal_data tax_id, or the partner tax ID when fiscal_data has none',
  })
  tax_id: string | null;

  @ApiProperty({ type: () => PartnerRefDto, nullable: true })
  partner: PartnerRefDto | null;

  @ApiProperty({ enum: PartnerLinkSource, example: PartnerLinkSource.RECEIPT })
  link_source: PartnerLinkSource;

  @ApiProperty({ type: () => OrderCustomerRefDto, nullable: true })
  order_customer: OrderCustomerRefDto | null;

  @ApiProperty({ example: 0, description: 'Balance still due on the order' })
  order_balance_due: number;
}

export class OnePartnerSyncReceiptResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => PartnerSyncReceiptDto })
  data: PartnerSyncReceiptDto;
}

export class PaginatedPartnerSyncReceiptsDto extends SuccessResponse {
  @ApiProperty({ type: () => [PartnerSyncReceiptDto] })
  data: PartnerSyncReceiptDto[];

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
