import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';
import { LoyaltyPointsTransactionController } from './loyalty-points-transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { CashTransaction } from '../../../restaurant-operations/cashdrawer/cash-transactions/entities/cash-transaction.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { LoyaltyPointTransaction } from './entities/loyalty-points-transaction.entity';
import { LoyaltyTier } from '../loyalty-tier/entities/loyalty-tier.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([
      Order,
      CashTransaction,
      LoyaltyCustomer,
      Customer,
      LoyaltyPointTransaction,
      LoyaltyTier,
    ]),
  ],
  controllers: [LoyaltyPointsTransactionController],
  providers: [LoyaltyPointsTransactionService],
  exports: [LoyaltyPointsTransactionService],
})
export class LoyaltyPointsTransactionModule {}
