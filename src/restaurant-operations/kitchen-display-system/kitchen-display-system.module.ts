import { Module } from '@nestjs/common';
import { KitchenDisplayDeviceModule } from './kitchen-display-device/kitchen-display-device.module';
import { KitchenEventLogModule } from './kitchen-event-log/kitchen-event-log.module';
import { KitchenOrderModule } from './kitchen-order/kitchen-order.module';
import { KitchenOrderItemModule } from './kitchen-order-item/kitchen-order-item.module';
import { KitchenStationModule } from './kitchen-station/kitchen-station.module';

@Module({
  imports: [
    KitchenDisplayDeviceModule,
    KitchenEventLogModule,
    KitchenOrderModule,
    KitchenOrderItemModule,
    KitchenStationModule,
  ],
  exports: [
    KitchenDisplayDeviceModule,
    KitchenEventLogModule,
    KitchenOrderModule,
    KitchenOrderItemModule,
    KitchenStationModule,
  ],
})
export class KitchenDisplaySystemModule {}
