import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';

import { Receipt } from '../receipts/entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { Customer } from 'src/core/business-partners/customers/entities/customer.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';

import { BillingPartnerSyncController } from './billing-partner-sync.controller';
import { BillingPartnerSyncService } from './billing-partner-sync.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Receipt, Order, Customer, Supplier, Merchant]),
  ],
  controllers: [BillingPartnerSyncController],
  providers: [BillingPartnerSyncService],
  exports: [BillingPartnerSyncService],
})
export class BillingPartnerSyncModule {}
