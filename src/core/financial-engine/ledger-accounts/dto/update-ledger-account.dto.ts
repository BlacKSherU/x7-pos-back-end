import { PartialType } from '@nestjs/swagger';
import { CreateLedgerAccountDto } from './create-ledger-account.dto';

export class UpdateLedgerAccountDto extends PartialType(
  CreateLedgerAccountDto,
) {}
