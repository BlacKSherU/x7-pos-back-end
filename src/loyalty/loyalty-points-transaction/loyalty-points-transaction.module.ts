import { Module } from '@nestjs/common';
import { LoyaltyPointsTransactionService } from './loyalty-points-transaction.service';
import { LoyaltyPointsTransactionController } from './loyalty-points-transaction.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/orders/entities/order.entity';
import { CashTransaction } from 'src/cash-transactions/entities/cash-transaction.entity';
import { LoyaltyCustomer } from '../loyalty-customer/entities/loyalty-customer.entity';
import { Customer } from 'src/customers/entities/customer.entity';
import { LoyaltyPointTransaction } from './entities/loyalty-points-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      CashTransaction,
      LoyaltyCustomer,
      Customer,
      LoyaltyPointTransaction,
    ]),
  ],
  controllers: [LoyaltyPointsTransactionController],
  providers: [LoyaltyPointsTransactionService],
  exports: [LoyaltyPointsTransactionService],
})
export class LoyaltyPointsTransactionModule {}
