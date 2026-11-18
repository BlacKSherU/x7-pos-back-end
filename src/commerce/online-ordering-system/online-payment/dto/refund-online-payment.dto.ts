import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class RefundOnlinePaymentDto {
  @ApiPropertyOptional({
    example: 25.5,
    description:
      'Optional refund amount for partial refunds. Omit or pass full amount for a full refund.',
  })
  @IsOptional()
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'Refund amount must have at most 2 decimal places' },
  )
  @Min(0.01, { message: 'Refund amount must be at least 0.01' })
  refundAmount?: number;

  @ApiPropertyOptional({
    example: 'Customer requested partial refund for missing item',
    description: 'Reason for issuing the refund',
  })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  reason?: string;
}
