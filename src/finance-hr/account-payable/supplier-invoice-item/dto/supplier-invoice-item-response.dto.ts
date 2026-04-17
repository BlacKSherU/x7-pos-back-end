import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class SupplierInvoiceItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  invoice_id: number;

  @ApiProperty({ example: 12, nullable: true })
  product_id: number | null;

  @ApiProperty({ example: 'Flour 25kg bag' })
  description: string;

  @ApiProperty({ example: 10 })
  quantity: number;

  @ApiProperty({ example: 50.0 })
  unit_price: number;

  @ApiProperty({ example: 500.0 })
  line_subtotal: number;

  @ApiProperty({ example: 95.0 })
  tax_amount: number;

  @ApiProperty({ example: 595.0 })
  line_total: number;
}

export class OneSupplierInvoiceItemResponseDto extends SuccessResponse {
  @ApiProperty({ type: SupplierInvoiceItemResponseDto })
  data: SupplierInvoiceItemResponseDto;
}
