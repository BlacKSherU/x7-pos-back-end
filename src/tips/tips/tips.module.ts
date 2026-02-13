import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipsService } from './tips.service';
import { TipsController } from './tips.controller';
import { Tip } from './entities/tip.entity';
import { Company } from '../../companies/entities/company.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Order } from '../../orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tip, Company, Merchant, Order]),
  ],
  controllers: [TipsController],
  providers: [TipsService],
  exports: [TipsService],
})
export class TipsModule {}
