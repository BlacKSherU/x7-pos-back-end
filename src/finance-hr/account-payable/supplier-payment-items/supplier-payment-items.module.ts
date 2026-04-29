import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierPaymentItemsService } from './supplier-payment-items.service';
import { SupplierPaymentItemsController } from './supplier-payment-items.controller';
import { SupplierPaymentItem } from './entities/supplier-payment-item.entity';
import { SupplierPayment } from '../supplier-payments/entities/supplier-payment.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([SupplierPaymentItem, SupplierPayment])],
  controllers: [SupplierPaymentItemsController],
  providers: [SupplierPaymentItemsService],
  exports: [SupplierPaymentItemsService],
})
export class SupplierPaymentItemsModule {}
