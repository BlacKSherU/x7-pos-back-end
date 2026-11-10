import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersModule } from 'src/restaurant-operations/pos/orders/orders.module';
import { MerchantPaymentConfigsModule } from '../merchant-payment-configs/merchant-payment-configs.module';
import { PaymentTerminalsModule } from '../payment-terminals/payment-terminals.module';
import { PaymentGatewayModule } from '../gateway/payment-gateway.module';
import { PaymentTransaction } from './entities/payment-transaction.entity';
import { MerchantPaymentConfig } from '../merchant-payment-configs/entities/merchant-payment-config.entity';
import { PaymentTerminal } from '../payment-terminals/entities/payment-terminal.entity';
import { PaymentTransactionsService } from './payment-transactions.service';
import { PaymentTransactionsController } from './payment-transactions.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentTransaction,
      MerchantPaymentConfig,
      PaymentTerminal,
    ]),
    PaymentGatewayModule,
    MerchantPaymentConfigsModule,
    PaymentTerminalsModule,
    OrdersModule,
  ],
  controllers: [PaymentTransactionsController],
  providers: [PaymentTransactionsService],
  exports: [PaymentTransactionsService],
})
export class PaymentTransactionsModule {}
