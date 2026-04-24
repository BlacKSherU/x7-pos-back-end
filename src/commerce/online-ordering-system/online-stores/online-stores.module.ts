import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { OnlineStoresService } from './online-stores.service';
import { OnlineStoresController } from './online-stores.controller';
import { OnlineStore } from './entities/online-store.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([OnlineStore, Merchant])],
  controllers: [OnlineStoresController],
  providers: [OnlineStoresService],
  exports: [OnlineStoresService],
})
export class OnlineStoresModule {}
