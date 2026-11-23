import { OrderPaymentStatus } from '../constants/order-payment-status.enum';
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

  @ApiProperty({ enum: OrderPaymentStatus })
  status: OrderPaymentStatus;

  @ApiProperty({ nullable: true })
  paymentTransactionId: number | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  source: string | null;

  @ApiProperty({ nullable: true })
  shift_id: number | null;
}

export class OneOrderPaymentResponseDto extends SuccessResponse {
  @ApiProperty({ type: OrderPaymentResponseDto })
  data: OrderPaymentResponseDto;
}
