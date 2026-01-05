//src/qr-code/qr-menu/qr-menu.module.ts
import { Module } from '@nestjs/common';
import { QrMenuController } from './qr-menu.controller';
import { QrMenuService } from './qr-menu.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QRMenu } from './entity/qr-menu.entity';
import { Merchant } from 'src/merchants/entities/merchant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([QRMenu, Merchant])],
  controllers: [QrMenuController],
  providers: [QrMenuService],
})
export class QrMenuModule {}
