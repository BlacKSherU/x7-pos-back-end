//src/commerce/delivery-system/delivery-tracking/dto/update-delivery-tracking.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryTrackingDto } from './create-delivery-tracking.dto';

export class UpdateDeliveryTrackingDto extends PartialType(
  CreateDeliveryTrackingDto,
) {}
