import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';

import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderTaxesService } from './order-taxes.service';
import { OrderTaxesController } from './order-taxes.controller';
import { OrderTax } from './entities/order-tax.entity';
import { Order } from '../orders/entities/order.entity';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [AuthModule,TypeOrmModule.forFeature([OrderTax, Order]), OrdersModule],
  controllers: [OrderTaxesController],
  providers: [OrderTaxesService],
  exports: [OrderTaxesService],
})
export class OrderTaxesModule {}
