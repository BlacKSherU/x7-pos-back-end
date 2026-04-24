import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderPaymentsService } from './order-payments.service';
import { OrderPaymentsController } from './order-payments.controller';
import { OrderPayment } from './entities/order-payment.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [TypeOrmModule.forFeature([OrderPayment, Order]), OrdersModule],
  controllers: [OrderPaymentsController],
  providers: [OrderPaymentsService],
  exports: [OrderPaymentsService],
})
export class OrderPaymentsModule {}
