import { Module } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyProgramsModule } from './loyalty-programs/loyalty-programs.module';
import { LoyaltyTierModule } from './loyalty-tier/loyalty-tier.module';
import { LoyaltyCustomerModule } from './loyalty-customer/loyalty-customer.module';
import { LoyaltyPointsModule } from './loyalty-points/loyalty-points.module';
import { LoyaltyPointsTransactionModule } from './loyalty-points-transaction/loyalty-points-transaction.module';

@Module({
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  imports: [LoyaltyProgramsModule, LoyaltyTierModule, LoyaltyCustomerModule, LoyaltyPointsModule, LoyaltyPointsTransactionModule],
})
export class LoyaltyModule {}
