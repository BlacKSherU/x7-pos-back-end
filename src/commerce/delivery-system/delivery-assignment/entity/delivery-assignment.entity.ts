//src/commerce/delivery-system/delivery-assignment/entity/delivery-assignment.entity.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { DeliveryDriver } from 'src/commerce/delivery-system/delivery-driver/entity/delivery-driver.entity';
import { Order } from 'src/orders/entities/order.entity';
import { DeliveryStatus } from '../../constants/delivery-status.enum';

@Entity({ name: 'delivery_assignments' })
export class DeliveryAssignment {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the Delivery Assignment',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: () => Order,
    example: 1,
    description: 'Identifier of the Order related',
  })
  @ManyToOne(() => Order, { eager: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({
    type: () => DeliveryDriver,
    example: 1,
    description: 'Identifier of the Delivery Driver related',
  })
  @ManyToOne(() => DeliveryDriver, { eager: true })
  @JoinColumn({ name: 'delivery_driver_id' })
  deliveryDriver: DeliveryDriver;

  @Column({ type: 'enum', enum: DeliveryStatus })
  delivery_status: DeliveryStatus;

  @ApiProperty({
    example: '2024-06-01T12:00:00Z',
    description: 'Scheduled delivery time assignment',
  })
  @Column({ type: 'timestamp', nullable: true })
  assigned_at: Date;

  @ApiProperty({
    example: '2024-06-01T12:15:00Z',
    description: 'Actual pickup time',
  })
  @Column({ type: 'timestamp', nullable: true })
  picked_up_at: Date;

  @ApiProperty({
    example: '2024-06-01T12:30:00Z',
    description: 'Actual delivery time',
  })
  @Column({ type: 'timestamp', nullable: true })
  delivered_at: Date;

  @ApiProperty({
    example: 'active',
    description: 'Status of the delivery driver',
  })
  @Column({ type: 'varchar', length: 50 })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
