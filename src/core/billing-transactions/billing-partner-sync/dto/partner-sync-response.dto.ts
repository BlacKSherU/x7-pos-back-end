import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

import { ReceiptType } from '../../receipts/constants/receipt-type.enum';
import {
  PartnerAssociation,
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

// ---- Historia 22: grid de recibos agrupados por socio ----

export class PartnerGroupDto {
  @ApiProperty({ enum: PartnerType, example: PartnerType.CUSTOMER })
  partner_type: PartnerType;

  @ApiProperty({ example: 12 })
  partner_id: number;

  @ApiProperty({ example: 'Inversiones Pacifico SpA' })
  name: string;

  @ApiProperty({
    example: '76.111.222-3',
    nullable: true,
    description:
      'Latest fiscal_data tax_id, or the partner tax ID when receipts carry none',
  })
  tax_id: string | null;

  @ApiProperty({ example: '76.111.222-3', nullable: true })
  fiscal_tax_id: string | null;

  @ApiProperty({ example: '77.890.123-4', nullable: true })
  partner_tax_id: string | null;

  @ApiProperty({
    enum: PartnerAssociation,
    example: PartnerAssociation.COMPANY,
    description:
      'company = supplier or customer associated to the company; merchant = branch-only customer',
  })
  association: PartnerAssociation;

  @ApiProperty({ example: 9, nullable: true })
  partner_company_id: number | null;

  @ApiProperty({
    example: 1,
    nullable: true,
    description: 'Merchant that registered the customer (null for suppliers)',
  })
  partner_merchant_id: number | null;

  @ApiProperty({ example: 8, description: 'Active receipts of the partner' })
  invoice_count: number;

  @ApiProperty({
    example: 3,
    description: 'Receipts explicitly linked to the partner',
  })
  linked_invoice_count: number;

  @ApiProperty({ example: 4520.4, description: 'Sum of grand_total' })
  total_volume: number;

  @ApiProperty({
    example: 310.0,
    description: 'Balance due on the distinct orders behind the receipts',
  })
  outstanding_balance: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({
    example: 2,
    description: 'Merchants (branches) that billed the partner',
  })
  merchant_count: number;

  @ApiProperty({ example: '2026-11-20T15:00:00.000Z', nullable: true })
  last_invoice_at: Date | null;
}

export class PartnerGroupsSummaryDto {
  @ApiProperty({ example: 25 })
  partners: number;

  @ApiProperty({ example: 140 })
  invoices: number;

  @ApiProperty({ example: 98230.15 })
  total_volume: number;
}

export class PaginatedPartnerGroupsDto extends SuccessResponse {
  @ApiProperty({ type: () => [PartnerGroupDto] })
  data: PartnerGroupDto[];

  @ApiProperty({ type: () => PartnerGroupsSummaryDto })
  summary: PartnerGroupsSummaryDto;

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

export class CompanyMerchantDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: 'Downtown Branch' })
  name: string;

  @ApiProperty({
    example: true,
    description:
      'Merchant of the session: only its receipts can be linked / unlinked',
  })
  is_current: boolean;
}

export class CompanyMerchantsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => [CompanyMerchantDto] })
  data: CompanyMerchantDto[];
}
