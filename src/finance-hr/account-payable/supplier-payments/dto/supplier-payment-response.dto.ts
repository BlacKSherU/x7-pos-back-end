import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SupplierPaymentStatus } from '../constants/supplier-payment-status.enum';

export class SupplierPaymentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  company_id: number;

  @ApiProperty({ example: 5 })
  supplier_id: number;

  @ApiProperty({ example: 'PAY-000123' })
  payment_number: string;

  @ApiProperty({ example: '2026-03-03' })
  payment_date: string;

  @ApiProperty({ example: 'bank_transfer' })
  payment_method: string;

  @ApiProperty({ example: 'TRX-998877', nullable: true })
  reference: string | null;

  @ApiProperty({ example: 2500.0 })
  total_amount: number;

  @ApiProperty({ example: 1000.0 })
  allocated_amount: number;

  @ApiProperty({ enum: SupplierPaymentStatus })
  status: SupplierPaymentStatus;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}

export class OneSupplierPaymentResponseDto extends SuccessResponse {
  @ApiProperty({ type: SupplierPaymentResponseDto })
  data: SupplierPaymentResponseDto;
}
