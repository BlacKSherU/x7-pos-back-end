import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineMenuService } from './online-menu.service';
import { OnlineMenuController } from './online-menu.controller';
import { OnlineMenu } from './entities/online-menu.entity';
import { OnlineStore } from '../online-stores/entities/online-store.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OnlineMenu, OnlineStore])],
  controllers: [OnlineMenuController],
  providers: [OnlineMenuService],
  exports: [OnlineMenuService],
})
export class OnlineMenuModule {}
