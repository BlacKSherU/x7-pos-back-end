import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsString, IsEnum, Min, MaxLength } from 'class-validator';
import { OnlineOrderPaymentStatus } from '../../online-order/constants/online-order-payment-status.enum';

export class CreateOnlinePaymentDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  @IsNumber({}, { message: 'Online order ID must be a number' })
  @IsNotEmpty({ message: 'Online order ID is required' })
  onlineOrderId: number;

  @ApiProperty({ example: 'stripe', description: 'Payment provider name (e.g., stripe, paypal, square)' })
  @IsString({ message: 'Payment provider must be a string' })
  @IsNotEmpty({ message: 'Payment provider is required' })
  @MaxLength(50, { message: 'Payment provider must not exceed 50 characters' })
  paymentProvider: string;

  @ApiProperty({ example: 'txn_1234567890', description: 'Transaction ID from the payment provider' })
  @IsString({ message: 'Transaction ID must be a string' })
  @IsNotEmpty({ message: 'Transaction ID is required' })
  @MaxLength(100, { message: 'Transaction ID must not exceed 100 characters' })
  transactionId: string;

  @ApiProperty({ example: 125.99, description: 'Payment amount' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsNotEmpty({ message: 'Amount is required' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount: number;

  @ApiProperty({
    example: OnlineOrderPaymentStatus.PAID,
    enum: OnlineOrderPaymentStatus,
    description: 'Payment status (pending, paid, failed, refunded)',
  })
  @IsEnum(OnlineOrderPaymentStatus, { message: 'Status must be a valid payment status' })
  @IsNotEmpty({ message: 'Status is required' })
  status: OnlineOrderPaymentStatus;

  @ApiPropertyOptional({
    example: '2024-01-15T08:30:00Z',
    description: 'Timestamp when the payment was processed',
    nullable: true,
    required: false,
  })
  @IsOptional()
  processedAt?: Date | null;
}
