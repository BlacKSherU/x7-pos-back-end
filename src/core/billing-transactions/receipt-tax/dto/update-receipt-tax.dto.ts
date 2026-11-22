import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
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
 * Editable fields of a receipt tax. The receipt cannot change and the `amount` is always
 * recalculated by the server when the rate, scope or item change.
 */
export class UpdateReceiptTaxDto {
  @ApiProperty({
    example: 'IVA 19%',
    description: 'Tax name or label',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  name?: string;

  @ApiProperty({
    example: 19,
    description:
      'Tax rate as a percentage. Max 999.99 with 2 decimals (decimal(5,2))',
    required: false,
  })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'rate must be a number with at most 2 decimal places (column precision decimal(5,2))',
    },
  )
  @IsOptional()
  @Min(0, { message: 'rate cannot be negative' })
  @Max(RECEIPT_TAX_RATE_MAX, {
    message: `rate cannot exceed ${RECEIPT_TAX_RATE_MAX} (column precision decimal(5,2))`,
  })
  rate?: number;

  @ApiProperty({
    enum: ReceiptTaxScope,
    required: false,
    description: 'Move the tax between the whole receipt and a single item',
  })
  @IsEnum(ReceiptTaxScope)
  @IsOptional()
  scope?: ReceiptTaxScope;

  @ApiProperty({
    example: 5,
    required: false,
    description:
      'Receipt item ID (same receipt). Required when the resulting scope is ITEM',
  })
  @IsNumber()
  @IsOptional()
  @IsPositive()
  receiptItemId?: number;
}
