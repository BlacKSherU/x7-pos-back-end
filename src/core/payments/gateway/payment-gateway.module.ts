import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MerchantPaymentConfigsModule } from '../merchant-payment-configs/merchant-payment-configs.module';
import { PaymentTerminalsModule } from '../payment-terminals/payment-terminals.module';
import { PaymentAdapterFactory } from './payment-adapter.factory';
import { PaymentProcessingService } from './payment-processing.service';

@Module({
  imports: [HttpModule, MerchantPaymentConfigsModule, PaymentTerminalsModule],
  providers: [PaymentAdapterFactory, PaymentProcessingService],
  exports: [PaymentProcessingService],
})
export class PaymentGatewayModule {}
