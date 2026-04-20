import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty, IsOptional, IsEnum, IsString, MaxLength } from 'class-validator';
import { OnlineOrderType } from '../constants/online-order-type.enum';
import { OnlineOrderPaymentStatus } from '../constants/online-order-payment-status.enum';

export class CreateOnlineOrderDto {
  @ApiProperty({ example: 1, description: 'Identifier of the Online Store' })
  @IsNumber({}, { message: 'Store ID must be a number' })
  @IsNotEmpty({ message: 'Store ID is required' })
  storeId: number;

  @ApiPropertyOptional({ example: 1, description: 'Identifier of the Order (optional)', nullable: true })
  @IsOptional()
  @IsNumber({}, { message: 'Order ID must be a number' })
  orderId?: number | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Customer' })
  @IsNumber({}, { message: 'Customer ID must be a number' })
  @IsNotEmpty({ message: 'Customer ID is required' })
  customerId: number;

  @ApiProperty({
    example: OnlineOrderType.DELIVERY,
    enum: OnlineOrderType,
    description: 'Type of the order (delivery, pickup, dine_in)',
  })
  @IsEnum(OnlineOrderType, { message: 'Type must be a valid order type' })
  @IsNotEmpty({ message: 'Type is required' })
  type: OnlineOrderType;

  @ApiProperty({
    example: OnlineOrderPaymentStatus.PENDING,
    enum: OnlineOrderPaymentStatus,
    description: 'Payment status of the order (pending, paid, failed, refunded)',
  })
  @IsEnum(OnlineOrderPaymentStatus, { message: 'Payment status must be a valid payment status' })
  @IsNotEmpty({ message: 'Payment status is required' })
  paymentStatus: OnlineOrderPaymentStatus;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z', description: 'Scheduled time for the order', nullable: true })
  @IsOptional()
  @IsString({ message: 'Scheduled at must be a valid date string' })
  scheduledAt?: string | null;

  @ApiPropertyOptional({ example: '2024-01-15T08:00:00Z', description: 'Time when the order was placed', nullable: true })
  @IsOptional()
  @IsString({ message: 'Placed at must be a valid date string' })
  placedAt?: string | null;

  @ApiPropertyOptional({ example: 'Please deliver to the back door', description: 'Additional notes for the order', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(5000, { message: 'Notes must not exceed 5000 characters' })
  notes?: string | null;
}
