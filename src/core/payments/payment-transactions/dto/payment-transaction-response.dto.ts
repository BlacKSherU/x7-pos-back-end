import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { PaymentProvider } from '../../constants/payment-provider.enum';
import {
  PaymentTransactionChannel,
  PaymentTransactionStatus,
  PaymentTransactionType,
} from '../constants/payment-transaction.enums';

export class PaymentTransactionDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ enum: PaymentTransactionType })
  type: PaymentTransactionType;

  @ApiProperty({ enum: PaymentTransactionChannel })
  channel: PaymentTransactionChannel;

  @ApiProperty({ enum: PaymentTransactionStatus })
  status: PaymentTransactionStatus;

  @ApiProperty({ enum: PaymentProvider })
  provider: PaymentProvider;

  @ApiProperty({ example: 28.5, description: 'Includes the tip on a sale' })
  amount: number;

  @ApiProperty({ example: 3 })
  tipAmount: number;

  @ApiProperty({ example: 10, description: 'Sale: refunded so far' })
  refundedAmount: number;

  @ApiProperty({
    example: 18.5,
    description: 'Sale: what can still be refunded',
  })
  refundableAmount: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ nullable: true })
  orderId: number | null;

  @ApiProperty({ nullable: true })
  orderPaymentId: number | null;

  @ApiProperty({
    nullable: true,
    description: 'Sale a refund or void belongs to',
  })
  parentTransactionId: number | null;

  @ApiProperty()
  paymentConfigId: number;

  @ApiProperty({ nullable: true })
  terminalId: number | null;

  @ApiProperty({ nullable: true, example: 'pi_3Nk...' })
  providerTransactionId: string | null;

  @ApiProperty({ nullable: true })
  authorizationCode: string | null;

  @ApiProperty({ nullable: true })
  providerCode: string | null;

  @ApiProperty({ nullable: true, example: 'Approval' })
  message: string | null;

  @ApiProperty({ nullable: true, example: 'visa' })
  cardBrand: string | null;

  @ApiProperty({ nullable: true, example: '4242' })
  cardLast4: string | null;

  @ApiProperty({ nullable: true })
  reason: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  completedAt: Date | null;
}

export class OnePaymentTransactionResponseDto extends SuccessResponse {
  @ApiProperty({ type: PaymentTransactionDto })
  data: PaymentTransactionDto;
}

export class RefundVoidResponseDto extends SuccessResponse {
  @ApiProperty({
    type: PaymentTransactionDto,
    description: 'The refund / void operation',
  })
  data: PaymentTransactionDto;

  @ApiProperty({
    type: PaymentTransactionDto,
    description: 'The original sale, updated',
  })
  sale: PaymentTransactionDto;
}
