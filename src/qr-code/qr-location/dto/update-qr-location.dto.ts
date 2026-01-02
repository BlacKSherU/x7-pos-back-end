//src/qr-code/qr-location/dto/update-qr-location.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateQRLocationDto } from './create-qr-location.dto';

export class UpdateQrLocationDto extends PartialType(CreateQRLocationDto) {}
