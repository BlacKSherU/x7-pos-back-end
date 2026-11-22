import { ApiPropertyOptional } from '@nestjs/swagger';
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

/** Filters shared by the receipt taxes list and its analytical summary. */
export class ReceiptTaxFiltersDto {
  @ApiPropertyOptional({ example: 10, description: 'Filter by receipt ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receiptId?: number;

  @ApiPropertyOptional({ example: 5, description: 'Filter by receipt item ID' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  receiptItemId?: number;

  @ApiPropertyOptional({
    enum: ReceiptTaxScope,
    description: 'Filter by scope',
  })
  @IsOptional()
  @IsEnum(ReceiptTaxScope)
  scope?: ReceiptTaxScope;

  @ApiPropertyOptional({
    example: 'IVA',
    description: 'Search by tax name (partial match)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'IVA 19%',
    description: 'Filter by tax type: exact tax name (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  taxName?: string;

  @ApiPropertyOptional({
    example: 19,
    description: 'Filter by applied rate (exact percentage, up to 2 decimals)',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'rate must be a number with at most 2 decimal places (column precision decimal(5,2))',
    },
  )
  @Min(0)
  @Max(RECEIPT_TAX_RATE_MAX)
  rate?: number;
}
