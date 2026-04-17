import {
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  IsOptional,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierInvoiceStatus } from '../constants/supplier-invoice-status.enum';

export class CreateSupplierInvoiceDto {
  @ApiProperty({ example: 10, description: 'Company owner of the invoice' })
  @IsNumber()
  @IsPositive()
  company_id: number;

  @ApiProperty({ example: 5, description: 'Supplier ID' })
  @IsNumber()
  @IsPositive()
  supplier_id: number;

  @ApiProperty({ example: 'INV-4567', description: 'Invoice number' })
  @IsString()
  @MaxLength(100)
  invoice_number: string;

  @ApiProperty({ example: '2025-03-01', description: 'Invoice date' })
  @IsDateString()
  invoice_date: string;

  @ApiProperty({ example: '2025-03-31', description: 'Due date' })
  @IsDateString()
  due_date: string;

  @ApiProperty({ example: 1000.0, description: 'Subtotal' })
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional({ example: 190.0, description: 'Tax total', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax_total?: number;

  @ApiProperty({ example: 1190.0, description: 'Total amount' })
  @IsNumber()
  @Min(0)
  total_amount: number;

  @ApiPropertyOptional({
    example: 400.0,
    description: 'Paid amount',
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paid_amount?: number;

  @ApiPropertyOptional({
    example: 790.0,
    description: 'Balance due (calculated if omitted)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  balance_due?: number;

  @ApiPropertyOptional({
    example: SupplierInvoiceStatus.PENDING,
    enum: SupplierInvoiceStatus,
    default: SupplierInvoiceStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(SupplierInvoiceStatus)
  status?: SupplierInvoiceStatus;

  @ApiPropertyOptional({ example: 'Optional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
