// src/qr-code/qr-location/qr-location.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { QRLocationController } from './qr-location.controller';
import { QRLocationService } from './qr-location.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QRMenu } from '../qr-menu/entity/qr-menu.entity';
import { Table } from 'src/restaurant-operations/dining-system/tables/entities/table.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { QRLocation } from './entity/qr-location.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([QRLocation, QRMenu, Table, Merchant])],
  controllers: [QRLocationController],
  providers: [QRLocationService],
})
export class QRLocationModule {}
