import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

import { ReceiptTaxScope } from '../../receipt-tax/constants/receipt-tax-scope.enum';
import { ReceiptResponseDto } from './receipt-response.dto';

export class ReceiptDetailItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Burger Combo' })
  name: string;

  @ApiProperty({ example: 'SKU-001', nullable: true, type: String })
  sku: string | null;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 12.5 })
  unit_price: number;

  @ApiProperty({ example: 25 })
  subtotal: number;

  @ApiProperty({ example: 2.5 })
  discount_amount: number;

  @ApiProperty({ example: 22.5 })
  total: number;
}

export class ReceiptDetailTaxDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: null,
    nullable: true,
    type: Number,
    description: 'Item the tax applies to (null for receipt-level taxes)',
  })
  receipt_item_id: number | null;

  @ApiProperty({ example: 'VAT' })
  name: string;

  @ApiProperty({ example: 19, description: 'Rate in percent' })
  rate: number;

  @ApiProperty({ example: 4.28 })
  amount: number;

  @ApiProperty({ enum: ReceiptTaxScope, example: ReceiptTaxScope.RECEIPT })
  scope: ReceiptTaxScope;
}

export class ReceiptDetailsDto {
  @ApiProperty({ type: () => ReceiptResponseDto })
  receipt: ReceiptResponseDto;

  @ApiProperty({
    type: () => [ReceiptDetailItemDto],
    description: 'Active line items of the receipt',
  })
  items: ReceiptDetailItemDto[];

  @ApiProperty({
    type: () => [ReceiptDetailTaxDto],
    description: 'Active tax lines of the receipt (receipt and item level)',
  })
  taxes: ReceiptDetailTaxDto[];

  @ApiProperty({ example: 22.5, description: 'Sum of the items total' })
  items_total: number;

  @ApiProperty({ example: 4.28, description: 'Sum of the tax lines amount' })
  taxes_total: number;
}

export class ReceiptDetailsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => ReceiptDetailsDto })
  data: ReceiptDetailsDto;
}
