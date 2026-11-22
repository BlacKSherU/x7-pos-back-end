import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { User } from 'src/platform-saas/users/entities/user.entity';

import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { BillingReportsController } from './billing-reports.controller';
import { BillingReportsService } from './billing-reports.service';

/** Reportes de facturación: solo lectura sobre recibos, líneas e impuestos. */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Receipt, ReceiptItem, ReceiptTax, User]),
  ],
  controllers: [BillingReportsController],
  providers: [BillingReportsService],
})
export class BillingReportsModule {}
