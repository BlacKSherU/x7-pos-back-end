import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

/** Máximo de recibos que genera un lote (una transacción). */
export const MAX_RECEIPTS_PER_BATCH = 500;

export class PostBatchToLedgerDto {
  @ApiProperty({
    example: 1,
    description:
      'ASSET account debited with each grand_total (cash / receivables)',
  })
  @IsInt()
  @Min(1)
  cashAccountId: number;

  @ApiProperty({
    example: 3,
    description: 'REVENUE account credited with each subtotal',
  })
  @IsInt()
  @Min(1)
  revenueAccountId: number;

  @ApiPropertyOptional({
    example: 4,
    description:
      'LIABILITY account credited with each total_tax (required for receipts with tax)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  taxAccountId?: number;

  @ApiPropertyOptional({
    example: 2,
    description:
      'EXPENSE or contra-REVENUE account debited with each total_discount (required for receipts with discounts)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  discountAccountId?: number;

  @ApiPropertyOptional({
    example: [10, 11],
    type: [Number],
    description: `Receipts to post. Omitted: up to ${MAX_RECEIPTS_PER_BATCH} unposted or pending receipts of the merchant, oldest first.`,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_RECEIPTS_PER_BATCH)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  receiptIds?: number[];
}
