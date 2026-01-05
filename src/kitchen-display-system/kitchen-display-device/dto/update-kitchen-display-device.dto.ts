import { PartialType } from '@nestjs/swagger';
import { CreateKitchenDisplayDeviceDto } from './create-kitchen-display-device.dto';

export class UpdateKitchenDisplayDeviceDto extends PartialType(CreateKitchenDisplayDeviceDto) {}
