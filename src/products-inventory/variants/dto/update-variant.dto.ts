import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateVariantDto } from './create-variant.dto';

export class UpdateVariantDto extends PartialType(
  OmitType(CreateVariantDto, ['productId'] as const),
) {}
