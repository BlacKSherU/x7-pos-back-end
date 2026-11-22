import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';
import { RECEIPT_TAX_RATE_MAX } from '../receipt-tax-calculation';

/**
 * The tax `amount` is NOT part of the payload: the server calculates it from the scope
 * (ITEM → taxable base of the receipt item, RECEIPT → receipt subtotal) and the rate.
 */
export class CreateReceiptTaxDto {
  @ApiProperty({ example: 10, description: 'Receipt ID this tax belongs to' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  receiptId: number;

  @ApiProperty({
    example: 5,
    description:
      'Receipt item ID. Required when scope is ITEM, must be omitted when scope is RECEIPT',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  receiptItemId?: number;

  @ApiProperty({ example: 'IVA 19%', description: 'Tax name or label' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @ApiProperty({
    example: 19,
    description:
      'Tax rate as a percentage (e.g., 19 for 19%). Max 999.99 with 2 decimals (decimal(5,2))',
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'rate must be a number with at most 2 decimal places (column precision decimal(5,2))',
    },
  )
  @IsNotEmpty()
  @Min(0, { message: 'rate cannot be negative' })
  @Max(RECEIPT_TAX_RATE_MAX, {
    message: `rate cannot exceed ${RECEIPT_TAX_RATE_MAX} (column precision decimal(5,2))`,
  })
  rate: number;

  @ApiProperty({
    enum: ReceiptTaxScope,
    description:
      'RECEIPT: tax over the receipt subtotal. ITEM: tax over the taxable base of one receipt item',
  })
  @IsEnum(ReceiptTaxScope)
  @IsNotEmpty()
  scope: ReceiptTaxScope;
}
