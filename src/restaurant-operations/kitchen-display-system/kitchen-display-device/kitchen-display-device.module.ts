import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenDisplayDeviceService } from './kitchen-display-device.service';
import { KitchenDisplayDeviceController } from './kitchen-display-device.controller';
import { KitchenDisplayDevice } from './entities/kitchen-display-device.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { KitchenStation } from '../kitchen-station/entities/kitchen-station.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([KitchenDisplayDevice, Merchant, KitchenStation]),
  ],
  controllers: [KitchenDisplayDeviceController],
  providers: [KitchenDisplayDeviceService],
  exports: [KitchenDisplayDeviceService],
})
export class KitchenDisplayDeviceModule {}
