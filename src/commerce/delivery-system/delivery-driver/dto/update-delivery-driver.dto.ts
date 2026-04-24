//src/commerce/delivery-system/delivery-driver/dto/update-delivery-driver.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryDriverDto } from './create-delivery-driver.dto';

export class UpdateDeliveryDriverDto extends PartialType(
  CreateDeliveryDriverDto,
) {}
