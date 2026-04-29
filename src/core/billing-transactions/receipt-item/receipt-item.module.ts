import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { ReceiptItemService } from './receipt-item.service';
import { ReceiptItemController } from './receipt-item.controller';
import { ReceiptItem } from './entities/receipt-item.entity';
import { Receipt } from '../receipts/entities/receipt.entity';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { ReceiptsModule } from '../receipts/receipts.module';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([ReceiptItem, Receipt, Order]),
    ReceiptsModule,
  ],
  controllers: [ReceiptItemController],
  providers: [ReceiptItemService],
  exports: [ReceiptItemService],
})
export class ReceiptItemModule {}
