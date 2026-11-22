import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';

export class ReceiptTaxResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiProperty({ example: 5, required: false, nullable: true })
  receipt_item_id?: number | null;

  @ApiProperty({ example: 'IVA 19%' })
  name: string;

  @ApiProperty({ example: 19 })
  rate: number;

  @ApiProperty({
    example: 4.28,
    description: 'Tax amount calculated by the server (rounded to the cent)',
  })
  amount: number;

  @ApiProperty({ enum: ReceiptTaxScope })
  scope: ReceiptTaxScope;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Inactive taxes are kept for history but excluded from totals',
  })
  is_active?: boolean;

  @ApiProperty({
    example: 'INV-000010',
    required: false,
    nullable: true,
    description: 'Invoice number of the receipt',
  })
  receipt_invoice_number?: string | null;

  @ApiProperty({
    example: false,
    description:
      'true when the parent receipt is fiscally locked: the tax cannot be edited, toggled or deleted (Historia 11)',
  })
  receipt_is_locked: boolean;

  @ApiProperty({
    example: 'USD',
    required: false,
    nullable: true,
    description: 'Currency of the receipt (ISO 4217)',
  })
  currency?: string | null;

  @ApiProperty({
    example: 125,
    required: false,
    nullable: true,
    description: 'Current subtotal of the receipt',
  })
  receipt_subtotal?: number | null;

  @ApiProperty({
    example: 23.75,
    required: false,
    nullable: true,
    description:
      'Current total tax of the receipt (already recalculated after a create/update/status change)',
  })
  receipt_total_tax?: number | null;

  @ApiProperty({
    example: 148.75,
    required: false,
    nullable: true,
    description: 'Current grand total of the receipt',
  })
  receipt_grand_total?: number | null;

  @ApiProperty({
    example: 'Burger Combo',
    required: false,
    nullable: true,
    description: 'Name of the receipt item (ITEM scope only)',
  })
  receipt_item_name?: string | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  created_at: Date;
}

export class OneReceiptTaxResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => ReceiptTaxResponseDto,
    description: 'The receipt tax',
  })
  data: ReceiptTaxResponseDto;
}
