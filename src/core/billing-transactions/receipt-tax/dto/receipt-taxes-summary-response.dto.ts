import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';

export class ReceiptTaxCurrencyTotalDto {
  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 1520.4, description: 'Active tax charged' })
  total_amount: number;

  @ApiProperty({ example: 1300, description: 'Of which RECEIPT scope' })
  receipt_scope_amount: number;

  @ApiProperty({ example: 220.4, description: 'Of which ITEM scope' })
  item_scope_amount: number;
}

export class ReceiptTaxScopeTotalDto {
  @ApiProperty({ enum: ReceiptTaxScope })
  scope: ReceiptTaxScope;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 12, description: 'Active tax lines' })
  count: number;

  @ApiProperty({ example: 1300 })
  total_amount: number;
}

export class ReceiptTaxTypeTotalDto {
  @ApiProperty({ example: 'IVA 19%' })
  name: string;

  @ApiProperty({ example: 19 })
  rate: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: 8, description: 'Active tax lines' })
  count: number;

  @ApiProperty({ example: 950.25 })
  total_amount: number;
}

export class ReceiptTaxFilterOptionsDto {
  @ApiProperty({ example: ['IVA 19%', 'Municipal 2%'], type: [String] })
  names: string[];

  @ApiProperty({ example: [2, 19], type: [Number] })
  rates: number[];
}

export class ReceiptTaxesSummaryDto {
  @ApiProperty({ example: 20, description: 'Tax lines matching the filters' })
  total_count: number;

  @ApiProperty({ example: 18 })
  active_count: number;

  @ApiProperty({ example: 2 })
  inactive_count: number;

  @ApiProperty({ example: 9, description: 'Receipts with active taxes' })
  receipts_count: number;

  @ApiProperty({ type: [ReceiptTaxCurrencyTotalDto] })
  totals_by_currency: ReceiptTaxCurrencyTotalDto[];

  @ApiProperty({ type: [ReceiptTaxScopeTotalDto] })
  by_scope: ReceiptTaxScopeTotalDto[];

  @ApiProperty({
    type: [ReceiptTaxTypeTotalDto],
    description: 'Active totals per tax type (name) and applied rate',
  })
  by_type: ReceiptTaxTypeTotalDto[];

  @ApiProperty({
    type: ReceiptTaxFilterOptionsDto,
    description: 'Tax types and rates used by the merchant, for the filters',
  })
  filter_options: ReceiptTaxFilterOptionsDto;
}

export class ReceiptTaxesSummaryResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => ReceiptTaxesSummaryDto })
  data: ReceiptTaxesSummaryDto;
}
