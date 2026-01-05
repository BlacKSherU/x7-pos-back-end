import { PartialType } from '@nestjs/swagger';
import { CreateOnlineDeliveryInfoDto } from './create-online-delivery-info.dto';

export class UpdateOnlineDeliveryInfoDto extends PartialType(CreateOnlineDeliveryInfoDto) {}
