import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class ReceiptItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiProperty({ example: 'Burger Combo' })
  name: string;

  @ApiProperty({ example: 'SKU-001', required: false, nullable: true })
  sku?: string | null;

  @ApiProperty({ example: 2 })
  quantity: number;

  @ApiProperty({ example: 12.5 })
  unit_price: number;

  @ApiProperty({ example: 25.0 })
  subtotal: number;

  @ApiProperty({ example: 2.5 })
  discount_amount: number;

  @ApiProperty({ example: 22.5 })
  total: number;

  @ApiProperty({
    example: '{"notes":"No onions"}',
    required: false,
    nullable: true,
  })
  metadata?: string | null;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  updated_at: Date;
}

export class OneReceiptItemResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => ReceiptItemResponseDto,
    description: 'The receipt item',
  })
  data: ReceiptItemResponseDto;
}
