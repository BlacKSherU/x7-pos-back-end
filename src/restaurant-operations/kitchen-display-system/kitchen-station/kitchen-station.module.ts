import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenStationService } from './kitchen-station.service';
import { KitchenStationController } from './kitchen-station.controller';
import { KitchenStation } from './entities/kitchen-station.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([KitchenStation, Merchant])],
  controllers: [KitchenStationController],
  providers: [KitchenStationService],
  exports: [KitchenStationService],
})
export class KitchenStationModule {}
