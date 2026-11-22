import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptAuditLog } from '../receipts/audit/entities/receipt-audit-log.entity';
import { ReceiptAdjustmentNote } from './entities/receipt-adjustment-note.entity';
import { ReceiptAdjustmentsController } from './receipt-adjustments.controller';
import { ReceiptAdjustmentsService } from './receipt-adjustments.service';

/** Notas de crédito / débito sobre recibos bloqueados (Historia 7). */
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Receipt, ReceiptAdjustmentNote, ReceiptAuditLog]),
  ],
  controllers: [ReceiptAdjustmentsController],
  providers: [ReceiptAdjustmentsService],
  exports: [ReceiptAdjustmentsService],
})
export class ReceiptAdjustmentsModule {}
