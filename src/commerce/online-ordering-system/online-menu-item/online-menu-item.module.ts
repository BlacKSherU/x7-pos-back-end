import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineMenuItemService } from './online-menu-item.service';
import { OnlineMenuItemController } from './online-menu-item.controller';
import { OnlineMenuItem } from './entities/online-menu-item.entity';
import { OnlineMenu } from '../online-menu/entities/online-menu.entity';
import { Product } from '../../../inventory/products-inventory/products/entities/product.entity';
import { Variant } from '../../../inventory/products-inventory/variants/entities/variant.entity';

@Module({
  imports: [AuthModule,
    TypeOrmModule.forFeature([OnlineMenuItem, OnlineMenu, Product, Variant]),
  ],
  controllers: [OnlineMenuItemController],
  providers: [OnlineMenuItemService],
  exports: [OnlineMenuItemService],
})
export class OnlineMenuItemModule {}
