import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { AccountType } from 'src/core/financial-engine/ledger-accounts/constants/account-type.enum';
import { JournalEntryStatus } from 'src/core/financial-engine/journal-entry/constants/journal-entry-status.enum';

import { ReceiptPostingStatus } from '../constants/posting-status.enum';
import { ReceiptTaxScope } from '../../receipt-tax/constants/receipt-tax-scope.enum';

export class FinancialSyncReceiptTaxDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'IVA 19%' })
  name: string;

  @ApiProperty({ example: 19 })
  rate: number;

  @ApiProperty({ example: 4.28 })
  amount: number;

  @ApiProperty({ enum: ReceiptTaxScope, example: ReceiptTaxScope.RECEIPT })
  scope: ReceiptTaxScope;

  @ApiProperty({ example: null, nullable: true, type: Number })
  receipt_item_id: number | null;
}

export class FinancialSyncJournalEntryDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'RCPT-INV-000001' })
  entry_number: string;

  @ApiProperty({ example: '2026-11-20' })
  entry_date: Date | string;

  @ApiProperty({ enum: JournalEntryStatus, example: JournalEntryStatus.POSTED })
  status: JournalEntryStatus;

  @ApiProperty({ example: 26.78 })
  total_debit: number;

  @ApiProperty({ example: 26.78 })
  total_credit: number;

  @ApiProperty({ example: true, description: 'Lines debit == credit' })
  is_balanced: boolean;

  @ApiProperty({ example: 3 })
  line_count: number;
}

export class FinancialSyncAccountMovementDto {
  @ApiProperty({ example: 4 })
  account_id: number;

  @ApiProperty({ example: '1100', nullable: true, type: String })
  code: string | null;

  @ApiProperty({ example: 'Cash on hand', nullable: true, type: String })
  name: string | null;

  @ApiProperty({
    enum: AccountType,
    nullable: true,
    example: AccountType.ASSET,
  })
  type: AccountType | null;

  @ApiProperty({ example: 26.78 })
  debit: number;

  @ApiProperty({ example: 0 })
  credit: number;
}

export class FinancialSyncVerificationDto {
  @ApiProperty({
    example: true,
    description: 'subtotal + total_tax − total_discount == grand_total',
  })
  receipt_totals_consistent: boolean;

  @ApiProperty({
    example: true,
    description: 'Sum of active ReceiptTax amounts == total_tax',
  })
  receipt_taxes_match_total: boolean;

  @ApiProperty({
    example: true,
    nullable: true,
    type: Boolean,
    description: 'Total debits == total credits (null without entries)',
  })
  entries_balanced: boolean | null;

  @ApiProperty({
    example: true,
    nullable: true,
    type: Boolean,
    description:
      'grand_total == net debit on ASSET accounts (null without entries)',
  })
  grand_total_matches_assets: boolean | null;

  @ApiProperty({
    example: true,
    nullable: true,
    type: Boolean,
    description:
      'total_tax == net credit on LIABILITY accounts (null without entries)',
  })
  tax_matches_liabilities: boolean | null;

  @ApiProperty({
    example: true,
    nullable: true,
    type: Boolean,
    description: 'Every flag passes (null when there is nothing to verify)',
  })
  is_balanced: boolean | null;
}

export class FinancialSyncRowDto {
  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiProperty({ example: 'INV-000001', nullable: true, type: String })
  invoice_number: string | null;

  @ApiProperty({ example: 'INVOICE' })
  type: string;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: false })
  is_locked: boolean;

  @ApiProperty({ example: '2026-11-20T15:04:05.000Z' })
  created_at: Date;

  @ApiProperty({ example: 25 })
  subtotal: number;

  @ApiProperty({ example: 4.28 })
  total_tax: number;

  @ApiProperty({ example: 2.5 })
  total_discount: number;

  @ApiProperty({ example: 26.78 })
  grand_total: number;

  @ApiProperty({
    enum: ReceiptPostingStatus,
    example: ReceiptPostingStatus.POSTED,
  })
  posting_status: ReceiptPostingStatus;

  @ApiProperty({ type: () => [FinancialSyncReceiptTaxDto] })
  receipt_taxes: FinancialSyncReceiptTaxDto[];

  @ApiProperty({
    type: () => [FinancialSyncJournalEntryDto],
    description: 'Linked journal entries (VOIDED included, flagged by status)',
  })
  journal_entries: FinancialSyncJournalEntryDto[];

  @ApiProperty({ example: [4, 7, 9], type: [Number] })
  ledger_account_ids: number[];

  @ApiProperty({
    type: () => [FinancialSyncAccountMovementDto],
    description:
      'Debit/credit aggregated per ledger account (non-voided entries)',
  })
  ledger_accounts: FinancialSyncAccountMovementDto[];

  @ApiProperty({ example: 29.28, description: 'Σ debits (non-voided entries)' })
  ledger_total_debit: number;

  @ApiProperty({
    example: 29.28,
    description: 'Σ credits (non-voided entries)',
  })
  ledger_total_credit: number;

  @ApiProperty({ example: 26.78, description: 'Net debit on ASSET accounts' })
  asset_net_debit: number;

  @ApiProperty({
    example: 4.28,
    description: 'Net credit on LIABILITY accounts',
  })
  liability_net_credit: number;

  @ApiProperty({ example: 4.28, description: 'Σ active ReceiptTax amounts' })
  receipt_taxes_total: number;

  @ApiProperty({ type: () => FinancialSyncVerificationDto })
  verification: FinancialSyncVerificationDto;
}

export class AllPaginatedFinancialSyncRows extends SuccessResponse {
  @ApiProperty({ type: () => [FinancialSyncRowDto] })
  data: FinancialSyncRowDto[];

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

export class FinancialSyncLineAccountDto {
  @ApiProperty({ example: 4 })
  id: number;

  @ApiProperty({ example: '1100' })
  code: string;

  @ApiProperty({ example: 'Cash on hand' })
  name: string;

  @ApiProperty({ enum: AccountType, example: AccountType.ASSET })
  type: AccountType;
}

export class FinancialSyncLineDto {
  @ApiProperty({ example: 31 })
  id: number;

  @ApiProperty({ example: 12 })
  journal_entry_id: number;

  @ApiProperty({ example: 'RCPT-INV-000001' })
  entry_number: string;

  @ApiProperty({ enum: JournalEntryStatus, example: JournalEntryStatus.POSTED })
  entry_status: JournalEntryStatus;

  @ApiProperty({ type: () => FinancialSyncLineAccountDto, nullable: true })
  account: FinancialSyncLineAccountDto | null;

  @ApiProperty({ example: 26.78 })
  debit: number;

  @ApiProperty({ example: 0 })
  credit: number;

  @ApiPropertyOptional({ example: 'Receipt INV-000001 · amount collected' })
  description: string | null;
}

export class FinancialSyncLinesDataDto {
  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiProperty({ example: 'INV-000001', nullable: true, type: String })
  invoice_number: string | null;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: null, nullable: true, type: Number })
  journal_entry_id: number | null;

  @ApiProperty({ type: () => [FinancialSyncLineDto] })
  lines: FinancialSyncLineDto[];

  @ApiProperty({
    example: 29.28,
    description:
      'Σ debits of the requested entry, or of every non-voided entry of the receipt',
  })
  total_debit: number;

  @ApiProperty({ example: 29.28 })
  total_credit: number;

  @ApiProperty({ example: true })
  is_balanced: boolean;
}

export class OneFinancialSyncLinesResponse extends SuccessResponse {
  @ApiProperty({ type: () => FinancialSyncLinesDataDto })
  data: FinancialSyncLinesDataDto;
}
