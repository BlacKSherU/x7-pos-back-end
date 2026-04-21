import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

import { ReceiptType } from '../constants/receipt-type.enum';

export class ReceiptResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 200 })
  order_id: number;

  @ApiProperty({ example: ReceiptType.INVOICE, enum: ReceiptType })
  type: ReceiptType;

  @ApiProperty({
    example: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
    required: false,
    nullable: true,
  })
  fiscal_data?: string | null;

  @ApiProperty({ example: 100.0 })
  subtotal: number;

  @ApiProperty({ example: 19.0 })
  total_tax: number;

  @ApiProperty({ example: 5.0 })
  total_discount: number;

  @ApiProperty({ example: 114.0 })
  grand_total: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  updated_at: Date;
}

export class OneReceiptResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => ReceiptResponseDto,
    description: 'The receipt',
  })
  data: ReceiptResponseDto;
}
