import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateOnlinePaymentDto } from './create-online-payment.dto';
import { OnlinePaymentStatus } from '../constants/online-payment-status.enum';

export class UpdateOnlinePaymentDto extends PartialType(
  CreateOnlinePaymentDto,
) {
  @ApiPropertyOptional({
    example: OnlinePaymentStatus.ACTIVE,
    enum: OnlinePaymentStatus,
    description: 'Logical lifecycle status (active, deleted)',
  })
  @IsOptional()
  @IsEnum(OnlinePaymentStatus)
  logicalStatus?: OnlinePaymentStatus;
}
