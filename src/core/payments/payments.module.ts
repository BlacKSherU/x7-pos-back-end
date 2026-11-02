import { Module } from '@nestjs/common';
import { MerchantPaymentConfigsModule } from './merchant-payment-configs/merchant-payment-configs.module';
import { PaymentTerminalsModule } from './payment-terminals/payment-terminals.module';
import { PaymentGatewayModule } from './gateway/payment-gateway.module';

@Module({
  imports: [
    MerchantPaymentConfigsModule,
    PaymentTerminalsModule,
    PaymentGatewayModule,
  ],
  exports: [PaymentGatewayModule],
})
export class PaymentsModule {}
