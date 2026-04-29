import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { TipsService } from './tips.service';
import { TipsController } from './tips.controller';
import { Tip } from './entities/tip.entity';
import { Company } from '../../../platform-saas/companies/entities/company.entity';
import { Merchant } from '../../../platform-saas/merchants/entities/merchant.entity';
import { Order } from '../../../restaurant-operations/pos/orders/entities/order.entity';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([Tip, Company, Merchant, Order])],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
