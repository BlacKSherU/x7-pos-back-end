import { PartialType } from '@nestjs/swagger';
import { CreateCashTransactionDto } from './create-cash-transaction.dto';

export class UpdateCashTransactionDto extends PartialType(
  CreateCashTransactionDto,
) {}
