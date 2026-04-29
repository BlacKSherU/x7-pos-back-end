import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptTaxService } from './receipt-tax.service';
import { ReceiptTaxController } from './receipt-tax.controller';
import { ReceiptTax } from './entities/receipt-tax.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([ReceiptTax, Receipt, ReceiptItem, Order]),
    ReceiptsModule,
  ],
  controllers: [ReceiptTaxController],
  providers: [ReceiptTaxService],
  exports: [ReceiptTaxService],
})
export class ReceiptTaxModule {}
