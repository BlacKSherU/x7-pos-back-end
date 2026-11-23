import { Module } from '@nestjs/common';
import { MerchantPaymentConfigsModule } from './merchant-payment-configs/merchant-payment-configs.module';
import { PaymentTerminalsModule } from './payment-terminals/payment-terminals.module';
import { PaymentGatewayModule } from './gateway/payment-gateway.module';
import { PaymentTransactionsModule } from './payment-transactions/payment-transactions.module';

@Module({
  imports: [
    MerchantPaymentConfigsModule,
    PaymentTerminalsModule,
    PaymentGatewayModule,
    PaymentTransactionsModule,
  ],
  exports: [PaymentGatewayModule],
})
export class PaymentsModule {}
