import { PartialType } from '@nestjs/swagger';
import { CreateOnlinePaymentDto } from './create-online-payment.dto';

export class UpdateOnlinePaymentDto extends PartialType(CreateOnlinePaymentDto) {}
