import { ApiProperty } from '@nestjs/swagger';
import {
  IsDecimal,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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

  @ApiProperty({ example: 2, description: 'Quantity sold' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ example: 12.5, description: 'Unit price before discount' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  unitPrice: number;

  @ApiProperty({
    example: 2.5,
    description: 'Discount amount applied to this line',
    required: false,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
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
