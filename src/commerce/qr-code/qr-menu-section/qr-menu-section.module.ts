//src/qr-code/qr-menu-section/qr-menu-section.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { QrMenuSectionController } from './qr-menu-section.controller';
import { QRMenuSectionService } from './qr-menu-section.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QRMenuSection } from './entity/qr-menu-section.entity';
import { QRMenu } from '../qr-menu/entity/qr-menu.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([QRMenuSection, QRMenu])],
  controllers: [QrMenuSectionController],
  providers: [QRMenuSectionService],
})
export class QRMenuSectionModule {}
