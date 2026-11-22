import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptsService } from './receipts.service';
import { ReceiptsCalculationService } from './receipts-calculation.service';
import { ReceiptsController } from './receipts.controller';
import { Receipt } from './entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { ReceiptAuditLog } from './audit/entities/receipt-audit-log.entity';
import { ReceiptAuditService } from './audit/receipt-audit.service';
import { User } from 'src/platform-saas/users/entities/user.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Receipt,
      Order,
      ReceiptItem,
      ReceiptTax,
      ReceiptAuditLog,
      User,
    ]),
  ],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, ReceiptsCalculationService, ReceiptAuditService],
  exports: [ReceiptsService, ReceiptsCalculationService, ReceiptAuditService],
})
export class ReceiptsModule {}
