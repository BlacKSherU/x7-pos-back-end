//src/commerce/delivery-system/delivery-fee/dto/update-delivery-fee.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateDeliveryFeeDto } from './create-delivery-fee.dto';

export class UpdateDeliveryFeeDto extends PartialType(CreateDeliveryFeeDto) {}
