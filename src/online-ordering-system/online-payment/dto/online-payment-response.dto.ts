import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from '../../../common/dtos/success-response.dto';
import { OnlineOrderPaymentStatus } from '../../online-order/constants/online-order-payment-status.enum';
import { OnlinePaymentStatus } from '../constants/online-payment-status.enum';

export class BasicOnlineOrderInfoDto {
  @ApiProperty({ example: 1, description: 'Online Order ID' })
  id: number;

  @ApiProperty({ example: 'active', description: 'Online Order status' })
  status: string;
}

export class OnlinePaymentResponseDto {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Online Payment' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  onlineOrderId: number;

  @ApiProperty({ example: 'stripe', description: 'Payment provider name' })
  paymentProvider: string;

  @ApiProperty({ example: 'txn_1234567890', description: 'Transaction ID from the payment provider' })
  transactionId: string;

  @ApiProperty({ example: 125.99, description: 'Payment amount' })
  amount: number;

  @ApiProperty({
    example: OnlineOrderPaymentStatus.PAID,
    enum: OnlineOrderPaymentStatus,
    description: 'Payment status (pending, paid, failed, refunded)',
  })
  status: OnlineOrderPaymentStatus;

  @ApiProperty({ example: '2024-01-15T08:30:00Z', description: 'Timestamp when the payment was processed', nullable: true })
  processedAt: Date | null;

  @ApiProperty({
    example: OnlinePaymentStatus.ACTIVE,
    enum: OnlinePaymentStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  logicalStatus: OnlinePaymentStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiProperty({ type: () => BasicOnlineOrderInfoDto, description: 'Online Order information' })
  onlineOrder: BasicOnlineOrderInfoDto;
}

export class OneOnlinePaymentResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => OnlinePaymentResponseDto, description: 'Online payment data' })
  data: OnlinePaymentResponseDto;
}







