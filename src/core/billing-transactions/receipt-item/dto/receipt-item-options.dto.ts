import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

/** One distinct item (name + SKU) that appears on the merchant's receipt lines. */
export class ReceiptItemOptionDto {
  @ApiProperty({ example: 'Burger Combo' })
  name: string;

  @ApiProperty({ example: 'SKU-001', nullable: true })
  sku: string | null;

  @ApiProperty({
    example: 12,
    description: 'Active lines with this item on active receipts',
  })
  line_count: number;
}

export class ReceiptItemOptionsResponseDto extends SuccessResponse {
  @ApiProperty({ type: [ReceiptItemOptionDto] })
  data: ReceiptItemOptionDto[];
}
