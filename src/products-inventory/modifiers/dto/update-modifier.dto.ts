import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateModifierDto } from './create-modifier.dto';

export class UpdateModifierDto extends PartialType(
  OmitType(CreateModifierDto, ['productId'] as const),
) {}
