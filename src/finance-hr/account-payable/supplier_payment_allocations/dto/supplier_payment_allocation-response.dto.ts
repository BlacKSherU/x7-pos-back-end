import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class SupplierPaymentAllocationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  payment_id: number;

  @ApiProperty({ example: 4, nullable: true })
  credit_note_id: number | null;

  @ApiProperty({ example: 5 })
  supplier_id: number;

  @ApiProperty({ example: 'INV-2026-001' })
  document_number: string;

  @ApiProperty({ example: 'invoice' })
  document_type: string;

  @ApiProperty({ example: 350.0 })
  allocated_amount: number;

  @ApiProperty({ example: '2026-03-03T10:30:00.000Z' })
  created_at: string;
}

export class OneSupplierPaymentAllocationResponseDto extends SuccessResponse {
  @ApiProperty({ type: SupplierPaymentAllocationResponseDto })
  data: SupplierPaymentAllocationResponseDto;
}
