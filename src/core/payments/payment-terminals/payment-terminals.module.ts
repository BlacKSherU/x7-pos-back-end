import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { CashDrawer } from 'src/restaurant-operations/cashdrawer/cash-drawers/entities/cash-drawer.entity';
import { PaymentTerminal } from './entities/payment-terminal.entity';
import { MerchantPaymentConfig } from '../merchant-payment-configs/entities/merchant-payment-config.entity';
import { PaymentTerminalsService } from './payment-terminals.service';
import { PaymentTerminalsController } from './payment-terminals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentTerminal,
      MerchantPaymentConfig,
      Merchant,
      CashDrawer,
    ]),
  ],
  controllers: [PaymentTerminalsController],
  providers: [PaymentTerminalsService],
  exports: [PaymentTerminalsService],
})
export class PaymentTerminalsModule {}
