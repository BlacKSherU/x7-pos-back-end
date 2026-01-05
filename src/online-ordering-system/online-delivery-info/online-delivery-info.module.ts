import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineDeliveryInfoService } from './online-delivery-info.service';
import { OnlineDeliveryInfoController } from './online-delivery-info.controller';
import { OnlineDeliveryInfo } from './entities/online-delivery-info.entity';
import { OnlineOrder } from '../online-order/entities/online-order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnlineDeliveryInfo, OnlineOrder]),
  ],
  controllers: [OnlineDeliveryInfoController],
  providers: [OnlineDeliveryInfoService],
  exports: [OnlineDeliveryInfoService],
})
export class OnlineDeliveryInfoModule {}
