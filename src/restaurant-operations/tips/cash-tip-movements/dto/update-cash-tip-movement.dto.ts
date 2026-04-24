import { PartialType } from '@nestjs/swagger';
import { CreateCashTipMovementDto } from './create-cash-tip-movement.dto';

export class UpdateCashTipMovementDto extends PartialType(
  CreateCashTipMovementDto,
) {}
