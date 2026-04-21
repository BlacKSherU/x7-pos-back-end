import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';

export class CreateReceiptTaxDto {
  @ApiProperty({ example: 10, description: 'Receipt ID this tax belongs to' })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  receiptId: number;

  @ApiProperty({
    example: 5,
    description: 'Receipt item ID (required when scope is ITEM)',
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
    description: 'Tax rate as a percentage (e.g., 19 for 19%)',
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  rate: number;

  @ApiProperty({ example: 4.28, description: 'Calculated tax amount' })
  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @ApiProperty({
    enum: ReceiptTaxScope,
    description:
      'Whether the tax applies to the whole receipt or a specific item',
  })
  @IsEnum(ReceiptTaxScope)
  @IsNotEmpty()
  scope: ReceiptTaxScope;
}
