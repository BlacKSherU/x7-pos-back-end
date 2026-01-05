import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenDisplayDeviceService } from './kitchen-display-device.service';
import { KitchenDisplayDeviceController } from './kitchen-display-device.controller';
import { KitchenDisplayDevice } from './entities/kitchen-display-device.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KitchenDisplayDevice, Merchant, KitchenStation]),
  ],
  controllers: [KitchenDisplayDeviceController],
  providers: [KitchenDisplayDeviceService],
  exports: [KitchenDisplayDeviceService],
})
export class KitchenDisplayDeviceModule {}
