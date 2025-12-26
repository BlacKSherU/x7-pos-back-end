import { PartialType } from '@nestjs/swagger';
import { CreateLoyaltyPointsTransactionDto } from './create-loyalty-points-transaction.dto';

export class UpdateLoyaltyPointsTransactionDto extends PartialType(CreateLoyaltyPointsTransactionDto) {}
