import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

import { ReceiptStatusFilter } from '../constants/receipt-status-filter.enum';

export class ReceiptTaxBreakdownEntryDto {
  @ApiProperty({ example: 'VAT' })
  name: string;

  @ApiProperty({ example: 19, description: 'Rate in percent' })
  rate: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 380.12, description: 'Sum of the tax lines amount' })
  total_amount: number;

  @ApiProperty({ example: 42, description: 'Tax lines grouped in this entry' })
  tax_lines: number;

  @ApiProperty({ example: 30, description: 'Distinct receipts carrying it' })
  receipts: number;
}

export class ReceiptTaxBreakdownCurrencyDto {
  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 410.4 })
  total_amount: number;

  @ApiProperty({ example: 50 })
  tax_lines: number;
}

export class ReceiptTaxBreakdownDto {
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
    example: 'USD',
    description:
      'Currency of total_tax: the one with the most tax lines (others are in by_currency)',
  })
  currency: string;

  @ApiProperty({ example: 410.4 })
  total_tax: number;

  @ApiProperty({
    type: () => [ReceiptTaxBreakdownEntryDto],
    description: 'Total collected per tax (name + rate), largest first',
  })
  by_tax: ReceiptTaxBreakdownEntryDto[];

  @ApiProperty({ type: () => [ReceiptTaxBreakdownCurrencyDto] })
  by_currency: ReceiptTaxBreakdownCurrencyDto[];
}

export class ReceiptTaxBreakdownResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => ReceiptTaxBreakdownDto })
  data: ReceiptTaxBreakdownDto;
}
