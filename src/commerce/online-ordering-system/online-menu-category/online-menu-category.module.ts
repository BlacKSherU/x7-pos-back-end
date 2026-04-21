import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineMenuCategoryService } from './online-menu-category.service';
import { OnlineMenuCategoryController } from './online-menu-category.controller';
import { OnlineMenuCategory } from './entities/online-menu-category.entity';
import { OnlineMenu } from '../online-menu/entities/online-menu.entity';
import { Category } from '../../../inventory/products-inventory/category/entities/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([OnlineMenuCategory, OnlineMenu, Category]),
  ],
  controllers: [OnlineMenuCategoryController],
  providers: [OnlineMenuCategoryService],
  exports: [OnlineMenuCategoryService],
})
export class OnlineMenuCategoryModule {}
