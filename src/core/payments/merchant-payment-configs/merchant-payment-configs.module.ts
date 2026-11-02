import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantPaymentConfig } from './entities/merchant-payment-config.entity';
import { MerchantPaymentConfigsService } from './merchant-payment-configs.service';
import { MerchantPaymentConfigsController } from './merchant-payment-configs.controller';
import { CredentialsCipherService } from '../utils/credentials-cipher.service';

@Module({
  imports: [TypeOrmModule.forFeature([MerchantPaymentConfig])],
  controllers: [MerchantPaymentConfigsController],
  providers: [MerchantPaymentConfigsService, CredentialsCipherService],
  exports: [MerchantPaymentConfigsService],
})
export class MerchantPaymentConfigsModule {}
