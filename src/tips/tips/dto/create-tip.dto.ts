import { IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TipMethod } from '../constants/tip-method.enum';
import { TipStatus } from '../constants/tip-status.enum';

export class CreateTipDto {
  @ApiProperty({
    example: 1,
    description: 'Identifier of the Company',
  })
  @IsNotEmpty({ message: 'Company ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Company ID must be a number' })
  @Min(1, { message: 'Company ID must be greater than 0' })
  companyId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Merchant',
  })
  @IsNotEmpty({ message: 'Merchant ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Merchant ID must be a number' })
  @Min(1, { message: 'Merchant ID must be greater than 0' })
  merchantId: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Order associated with the tip',
  })
  @IsNotEmpty({ message: 'Order ID is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Order ID must be a number' })
  @Min(1, { message: 'Order ID must be greater than 0' })
  orderId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Identifier of the payment transaction (optional)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Payment ID must be a number' })
  @Min(1, { message: 'Payment ID must be greater than 0' })
  paymentId?: number | null;

  @ApiProperty({
    example: 5.50,
    description: 'Tip amount',
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount must be greater than or equal to 0' })
  amount: number;

  @ApiProperty({
    example: TipMethod.CARD,
    enum: TipMethod,
    description: 'Payment method (card, cash, online)',
  })
  @IsNotEmpty({ message: 'Method is required' })
  @IsEnum(TipMethod, { message: 'Method must be one of: card, cash, online' })
  method: TipMethod;

  @ApiProperty({
    example: TipStatus.PENDING,
    enum: TipStatus,
    description: 'Tip status (pending, allocated, settled)',
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(TipStatus, { message: 'Status must be one of: pending, allocated, settled' })
  status: TipStatus;
}
