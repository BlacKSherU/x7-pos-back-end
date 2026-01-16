// src/qr-code/qr-location/qr-location.module.ts
import { Module } from '@nestjs/common';
import { QRLocationController } from './qr-location.controller';
import { QRLocationService } from './qr-location.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QRMenu } from '../qr-menu/entity/qr-menu.entity';
import { Table } from 'src/tables/entities/table.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';
import { QRLocation } from './entity/qr-location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QRLocation, QRMenu, Table, Merchant])],
  controllers: [QRLocationController],
  providers: [QRLocationService],
})
export class QRLocationModule {}
