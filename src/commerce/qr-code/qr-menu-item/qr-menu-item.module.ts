//src/qr-code/qr-menu-item/qr-menu-item.module.ts
import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { QRMenuItemController } from './qr-menu-item.controller';
import { QRMenuItemService } from './qr-menu-item.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QRMenuItem } from './entity/qr-menu-item.entity';
import { Product } from 'src/inventory/products-inventory/products/entities/product.entity';
import { QRMenuSection } from '../qr-menu-section/entity/qr-menu-section.entity';
import { Variant } from 'src/inventory/products-inventory/variants/entities/variant.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([QRMenuItem, Product, QRMenuSection, Variant]),
  ],
  controllers: [QRMenuItemController],
  providers: [QRMenuItemService],
})
export class QRMenuItemModule {}
