import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenEventLogService } from './kitchen-event-log.service';
import { KitchenEventLogController } from './kitchen-event-log.controller';
import { KitchenEventLog } from './entities/kitchen-event-log.entity';
import { KitchenOrder } from '../kitchen-order/entities/kitchen-order.entity';
import { KitchenOrderItem } from '../kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';
import { User } from '../../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KitchenEventLog, KitchenOrder, KitchenOrderItem, KitchenStation, User]),
  ],
  controllers: [KitchenEventLogController],
  providers: [KitchenEventLogService],
  exports: [KitchenEventLogService],
})
export class KitchenEventLogModule {}
