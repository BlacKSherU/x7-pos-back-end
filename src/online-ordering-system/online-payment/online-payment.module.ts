import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlinePaymentService } from './online-payment.service';
import { OnlinePaymentController } from './online-payment.controller';
import { OnlinePayment } from './entities/online-payment.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnlinePayment, OnlineOrder]),
  ],
  controllers: [OnlinePaymentController],
  providers: [OnlinePaymentService],
  exports: [OnlinePaymentService],
})
export class OnlinePaymentModule {}
