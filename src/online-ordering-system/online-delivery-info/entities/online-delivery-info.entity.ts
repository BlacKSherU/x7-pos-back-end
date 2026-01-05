import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { OnlineOrder } from '../../online-order/entities/online-order.entity';
import { OnlineDeliveryInfoStatus } from '../constants/online-delivery-info-status.enum';

@Entity('online_delivery_info')
@Index(['online_order_id'])
@Index(['status'])
export class OnlineDeliveryInfo {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Online Delivery Info' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Order' })
  @Column({ name: 'online_order_id' })
  online_order_id: number;

  @ManyToOne(() => OnlineOrder, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'online_order_id' })
  onlineOrder: OnlineOrder;

  @ApiProperty({ example: 'John Doe', description: 'Customer name for delivery' })
  @Column({ type: 'varchar', length: 100, name: 'customer_name' })
  customer_name: string;

  @ApiProperty({ example: '123 Main Street, Apt 4B', description: 'Delivery address' })
  @Column({ type: 'varchar', length: 200 })
  address: string;

  @ApiProperty({ example: 'New York', description: 'City for delivery' })
  @Column({ type: 'varchar', length: 100 })
  city: string;

  @ApiProperty({ example: '+1-555-123-4567', description: 'Contact phone number' })
  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @ApiProperty({ example: 'Ring the doorbell twice', description: 'Special delivery instructions', nullable: true })
  @Column({ type: 'text', nullable: true, name: 'delivery_instructions' })
  delivery_instructions: string | null;

  @ApiProperty({
    example: OnlineDeliveryInfoStatus.ACTIVE,
    enum: OnlineDeliveryInfoStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OnlineDeliveryInfoStatus,
    default: OnlineDeliveryInfoStatus.ACTIVE,
  })
  status: OnlineDeliveryInfoStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
