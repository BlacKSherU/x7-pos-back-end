//src/commerce/delivery-system/delivery-zone/dto/update-delivery-zone.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryZoneDto } from './create-delivery-zone.dto';

export class UpdateDeliveryZoneDto extends PartialType(CreateDeliveryZoneDto) {}
