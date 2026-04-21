import { PartialType } from '@nestjs/swagger';
import { CreateCashDrawerHistoryDto } from './create-cash-drawer-history.dto';

export class UpdateCashDrawerHistoryDto extends PartialType(
  CreateCashDrawerHistoryDto,
) {}
