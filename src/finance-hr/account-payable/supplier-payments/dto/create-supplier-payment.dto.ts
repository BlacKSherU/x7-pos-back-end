import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SupplierPaymentStatus } from '../constants/supplier-payment-status.enum';

export class CreateSupplierPaymentDto {
  @ApiProperty({ example: 10, description: 'Company owner of the payment' })
  @IsNumber()
  @IsPositive()
  company_id: number;

  @ApiProperty({ example: 5, description: 'Supplier ID' })
  @IsNumber()
  @IsPositive()
  supplier_id: number;

  @ApiProperty({ example: 'PAY-000123', description: 'Unique payment number' })
  @IsString()
  @MaxLength(100)
  payment_number: string;

  @ApiProperty({ example: '2026-03-03', description: 'Payment date' })
  @IsDateString()
  payment_date: string;

  @ApiProperty({
    example: 'bank_transfer',
    description: 'Payment method (bank_transfer, cash, check)',
  })
  @IsString()
  @MaxLength(50)
  payment_method: string;

  @ApiPropertyOptional({
    example: 'TRX-998877',
    description: 'External reference',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiProperty({ example: 2500.0, description: 'Total payment amount' })
  @IsNumber()
  @Min(0)
  total_amount: number;

  @ApiPropertyOptional({ example: 1000.0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  allocated_amount?: number;

  @ApiPropertyOptional({
    example: SupplierPaymentStatus.DRAFT,
    enum: SupplierPaymentStatus,
    default: SupplierPaymentStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(SupplierPaymentStatus)
  status?: SupplierPaymentStatus;
}
