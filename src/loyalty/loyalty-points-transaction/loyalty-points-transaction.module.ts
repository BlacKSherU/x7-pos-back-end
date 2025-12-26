import { Module } from '@nestjs/common';
import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';
import { LoyaltyPointsTransactionController } from './loyalty-points-transaction.controller';

@Module({
  controllers: [LoyaltyPointsTransactionController],
  providers: [LoyaltyPointsTransactionService],
})
export class LoyaltyPointsTransactionModule {}
