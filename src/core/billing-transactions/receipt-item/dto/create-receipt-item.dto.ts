import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  RECEIPT_ITEM_MAX_AMOUNT,
  RECEIPT_ITEM_MAX_QUANTITY,
} from '../receipt-item-calculation';

export class CreateReceiptItemDto {
  @ApiProperty({ example: 10, description: 'Receipt ID this item belongs to' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  receiptId: number;

  @ApiProperty({
    example: 'Burger Combo',
    description: 'Item name as it appears on the receipt',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'SKU-001',
    description: 'Stock Keeping Unit code',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({
    example: 2,
    description:
      'Quantity sold (decimal(10,2): > 0, at most 2 decimal places, max 99,999,999.99)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0.01)
  @Max(RECEIPT_ITEM_MAX_QUANTITY)
  quantity: number;

  @ApiProperty({
    example: 12.5,
    description:
      'Unit price before discount (decimal(12,2): >= 0, at most 2 decimal places)',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0)
  @Max(RECEIPT_ITEM_MAX_AMOUNT)
  unitPrice: number;

  @ApiProperty({
    example: 2.5,
    description:
      'Discount amount applied to this line (>= 0 and <= quantity × unitPrice)',
    required: false,
    default: 0,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsOptional()
  @Min(0)
  @Max(RECEIPT_ITEM_MAX_AMOUNT)
  discountAmount?: number;

  @ApiProperty({
    example: '{"notes":"No onions"}',
    description: 'Arbitrary metadata in JSON format',
    required: false,
  })
  @IsString()
  @IsOptional()
  metadata?: string;
}
