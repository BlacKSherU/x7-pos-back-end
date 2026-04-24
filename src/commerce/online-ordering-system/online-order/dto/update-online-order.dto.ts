import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator';
import { OnlineOrderType } from '../constants/online-order-type.enum';
import { OnlineOrderPaymentStatus } from '../constants/online-order-payment-status.enum';

export class UpdateOnlineOrderDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Online Store',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Store ID must be a number' })
  storeId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Order',
    nullable: true,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Order ID must be a number' })
  orderId?: number | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the Customer',
  })
  @IsOptional()
  @IsNumber({}, { message: 'Customer ID must be a number' })
  customerId?: number;

  @ApiPropertyOptional({
    example: OnlineOrderType.DELIVERY,
    enum: OnlineOrderType,
    description: 'Type of the order (delivery, pickup, dine_in)',
  })
  @IsOptional()
  @IsEnum(OnlineOrderType, { message: 'Type must be a valid order type' })
  type?: OnlineOrderType;

  @ApiPropertyOptional({
    example: OnlineOrderPaymentStatus.PAID,
    enum: OnlineOrderPaymentStatus,
    description:
      'Payment status of the order (pending, paid, failed, refunded)',
  })
  @IsOptional()
  @IsEnum(OnlineOrderPaymentStatus, {
    message: 'Payment status must be a valid payment status',
  })
  paymentStatus?: OnlineOrderPaymentStatus;

  @ApiPropertyOptional({
    example: '2024-01-15T10:00:00Z',
    description: 'Scheduled time for the order',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Scheduled at must be a valid date string' })
  scheduledAt?: string | null;

  @ApiPropertyOptional({
    example: '2024-01-15T08:00:00Z',
    description: 'Time when the order was placed',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Placed at must be a valid date string' })
  placedAt?: string | null;

  @ApiPropertyOptional({
    example: 'Updated delivery instructions',
    description: 'Additional notes for the order',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  @MaxLength(5000, { message: 'Notes must not exceed 5000 characters' })
  notes?: string | null;
}
