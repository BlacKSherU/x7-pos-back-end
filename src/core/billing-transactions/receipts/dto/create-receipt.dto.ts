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
    example: '{"tax_id": "J-12345678-9", "exemption_code": "EX-2026-001"}',
    description:
      'Fiscal data as a JSON object string. Supported keys: tax_id (string), ' +
      'exemption_code (string, exemption certificate ID) and tax_exempt (boolean, optional). ' +
      'The receipt is tax-exempt when tax_exempt is true, or when tax_exempt is absent and ' +
      'exemption_code is a non-empty string; tax_exempt: true requires exemption_code. ' +
      'Exempt receipts get total_tax = 0 and all their active receipt taxes set to 0.00. ' +
      'Other keys are preserved as-is.',
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
