import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class SupplierPaymentItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  payment_id: number;

  @ApiProperty({ example: 'INV-2025-001' })
  document_number: string;

  @ApiProperty({ example: 'invoice' })
  document_type: string;

  @ApiProperty({ example: 500.0 })
  amount: number;
}

export class OneSupplierPaymentItemResponseDto extends SuccessResponse {
  @ApiProperty({ type: SupplierPaymentItemResponseDto })
  data: SupplierPaymentItemResponseDto;
}
