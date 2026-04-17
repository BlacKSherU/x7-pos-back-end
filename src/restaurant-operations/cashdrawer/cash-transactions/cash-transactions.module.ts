import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashTransactionsService } from './cash-transactions.service';
import { CashTransactionsController } from './cash-transactions.controller';
import { CashTransaction } from './entities/cash-transaction.entity';
import { CashDrawer } from '../cash-drawers/entities/cash-drawer.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';
import { Collaborator } from '../../../finance-hr/hr/collaborators/entities/collaborator.entity';
import { CashDrawerHistoryModule } from '../cash-drawer-history/cash-drawer-history.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CashTransaction,
      CashDrawer,
      Collaborator,
      Order,
    ]),
    CashDrawerHistoryModule,
  ],
  controllers: [CashTransactionsController],
  providers: [CashTransactionsService],
})
export class CashTransactionsModule {}
