//src/commerce/delivery-system/delivery-asignment/delivery-assignment.module.ts
import { Module } from '@nestjs/common';
import { DeliveryAssignmentController } from './delivery-assignment.controller';
import { DeliveryAssignmentService } from './delivery-assignment.service';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';
import { DeliveryDriver } from '../delivery-driver/entity/delivery-driver.entity';
import { DeliveryAssignment } from './entity/delivery-assignment.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([DeliveryAssignment, DeliveryDriver, Order]),
  ],
  controllers: [DeliveryAssignmentController],
  providers: [DeliveryAssignmentService],
})
export class DeliveryAssignmentModule {}
