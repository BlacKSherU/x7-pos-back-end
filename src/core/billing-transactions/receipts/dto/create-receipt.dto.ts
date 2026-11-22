import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  Matches,
} from 'class-validator';
import { ReceiptType } from '../constants/receipt-type.enum';

export class CreateReceiptDto {
  @ApiProperty({
    example: 200,
    description: 'Order ID associated to the receipt',
  })
  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  orderId: number;

  @ApiProperty({
    example: ReceiptType.INVOICE,
    enum: ReceiptType,
    description: 'Type of receipt',
  })
  @IsEnum(ReceiptType)
  @IsNotEmpty()
  type: ReceiptType;

  @ApiProperty({
    example: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
    description: 'Fiscal data in JSON format',
    required: false,
  })
  @IsString()
  @IsOptional()
  fiscalData?: string;

  @ApiProperty({ example: 'USD', description: 'Currency code (ISO 4217)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  currency: string;

  @ApiPropertyOptional({
    example: 'INV-000123',
    description:
      'Invoice number, unique per merchant. When omitted on create, the next sequential INV-###### number is assigned.',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/\S/, { message: 'invoiceNumber must not be blank' })
  invoiceNumber?: string;
}
