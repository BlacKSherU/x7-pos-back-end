import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSupplierPaymentItemDto {
  @ApiProperty({ example: 1, description: 'Parent supplier payment ID' })
  @IsInt()
  @IsPositive()
  payment_id: number;

  @ApiProperty({
    example: 'INV-2025-001',
    description: 'Document / invoice number',
  })
  @IsString()
  @MaxLength(100)
  document_number: string;

  @ApiProperty({
    example: 'invoice',
    description: 'invoice, debit_note, adjustment, advance, etc.',
  })
  @IsString()
  @MaxLength(50)
  document_type: string;

  @ApiProperty({ example: 500.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount: number;
}
