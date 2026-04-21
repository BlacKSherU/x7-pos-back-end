import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';

export class ReceiptTaxResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiProperty({ example: 5, required: false, nullable: true })
  receipt_item_id?: number | null;

  @ApiProperty({ example: 'IVA 19%' })
  name: string;

  @ApiProperty({ example: 19 })
  rate: number;

  @ApiProperty({ example: 4.28 })
  amount: number;

  @ApiProperty({ enum: ReceiptTaxScope })
  scope: ReceiptTaxScope;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  created_at: Date;
}

export class OneReceiptTaxResponseDto extends SuccessResponse {
  @ApiProperty({
    type: () => ReceiptTaxResponseDto,
    description: 'The receipt tax',
  })
  data: ReceiptTaxResponseDto;
}
