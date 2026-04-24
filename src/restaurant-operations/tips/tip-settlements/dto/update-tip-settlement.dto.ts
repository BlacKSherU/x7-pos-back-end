import { PartialType } from '@nestjs/swagger';
import { CreateTipSettlementDto } from './create-tip-settlement.dto';

export class UpdateTipSettlementDto extends PartialType(
  CreateTipSettlementDto,
) {}
