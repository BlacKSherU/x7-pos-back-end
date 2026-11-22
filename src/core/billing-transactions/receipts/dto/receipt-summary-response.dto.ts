import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

import { ReceiptType } from '../constants/receipt-type.enum';
import { ReceiptStatusFilter } from '../constants/receipt-status-filter.enum';

export class ReceiptSummaryByTypeDto {
  @ApiProperty({ enum: ReceiptType, example: ReceiptType.INVOICE })
  type: ReceiptType;

  @ApiProperty({
    example: 12,
    description: 'Receipts of this type (all currencies)',
  })
  receipts: number;

  @ApiProperty({
    example: 1520.75,
    description: 'Sum of grand_total of this type in the summary currency',
  })
  grand_total: number;
}

export class ReceiptSummaryByCurrencyDto {
  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 20 })
  receipts: number;

  @ApiProperty({ example: 2450.5 })
  grand_total: number;

  @ApiProperty({ example: 390.12 })
  total_tax: number;
}

export class ReceiptSummaryDto {
  @ApiProperty({
    enum: ReceiptStatusFilter,
    example: ReceiptStatusFilter.ACTIVE,
  })
  status: ReceiptStatusFilter;

  @ApiProperty({ example: '2026-11-01', nullable: true, type: String })
  date_from: string | null;

  @ApiProperty({ example: '2026-11-30', nullable: true, type: String })
  date_to: string | null;

  @ApiProperty({
    example: 20,
    description: 'Receipts matching the status filter',
  })
  total_receipts: number;

  @ApiProperty({
    example: 20,
    description: 'Active receipts (is_active = true)',
  })
  active_receipts: number;

  @ApiProperty({ example: 3, description: 'Logically deleted receipts' })
  inactive_receipts: number;

  @ApiProperty({
    example: 15,
    description: 'Fiscally locked receipts matching the filter',
  })
  locked_receipts: number;

  @ApiProperty({
    example: 'USD',
    description:
      'Currency of the amounts below: the one with the most receipts (amounts of other currencies are in by_currency)',
  })
  currency: string;

  @ApiProperty({ example: 2450.5, description: 'Sum of grand_total' })
  grand_total: number;

  @ApiProperty({ example: 2100 })
  subtotal: number;

  @ApiProperty({ example: 390.12 })
  total_tax: number;

  @ApiProperty({ example: 39.62 })
  total_discount: number;

  @ApiProperty({
    example: 122.53,
    description: 'grand_total / receipts in the summary currency',
  })
  average_ticket: number;

  @ApiProperty({ type: () => [ReceiptSummaryByTypeDto] })
  by_type: ReceiptSummaryByTypeDto[];

  @ApiProperty({ type: () => [ReceiptSummaryByCurrencyDto] })
  by_currency: ReceiptSummaryByCurrencyDto[];
}

export class ReceiptSummaryResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => ReceiptSummaryDto })
  data: ReceiptSummaryDto;
}
