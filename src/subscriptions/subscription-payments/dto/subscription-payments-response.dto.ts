//src/subscriptions/subscription-payments/dto/subscription-payments-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SubscriptionPayment } from '../entity/subscription-payments.entity';

export class SubscriptionPaymentResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({
    example: 1,
    description: 'ID of the Merchant Subscription Associated',
  })
  merchantSubscription: { id: number };

  @ApiProperty({ example: 10900 })
  amount: number;

  @ApiProperty({ example: 'Pesos' })
  currency: string;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: '2025-10-07' })
  paymentDate: Date;

  @ApiProperty({ example: 'credit_card' })
  paymentMethod: string;
}

export class OneSubscriptionPaymentResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionPayment;
}

export class ALlSubscriptionPaymentsResponseDto extends SuccessResponse {
  @ApiProperty()
  data: SubscriptionPayment[];
}
