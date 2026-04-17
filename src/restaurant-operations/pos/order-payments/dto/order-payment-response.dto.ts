import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';

export class OrderPaymentResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orderId: number;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  method: string;

  @ApiProperty({ nullable: true })
  provider: string | null;

  @ApiProperty({ nullable: true })
  reference: string | null;

  @ApiProperty()
  tipAmount: number;

  @ApiProperty()
  isRefund: boolean;

  @ApiProperty()
  createdAt: Date;
}

export class OneOrderPaymentResponseDto extends SuccessResponse {
  @ApiProperty({ type: OrderPaymentResponseDto })
  data: OrderPaymentResponseDto;
}
