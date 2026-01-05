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
import { Merchant } from '../../../merchants/entities/merchant.entity';
import { Order } from '../../../orders/entities/order.entity';
import { OnlineOrder } from '../../../online-ordering-system/online-order/entities/online-order.entity';
import { KitchenStation } from '../../kitchen-station/entities/kitchen-station.entity';
import { KitchenOrderStatus } from '../constants/kitchen-order-status.enum';
import { KitchenOrderBusinessStatus } from '../constants/kitchen-order-business-status.enum';

@Entity('kitchen_order')
@Index(['merchant_id'])
@Index(['order_id'])
@Index(['online_order_id'])
@Index(['station_id'])
@Index(['status'])
@Index(['business_status'])
export class KitchenOrder {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Kitchen Order' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, {
    nullable: false,
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({ example: 1, description: 'Identifier of the Order', nullable: true })
  @Column({ name: 'order_id', nullable: true })
  order_id: number | null;

  @ManyToOne(() => Order, {
    nullable: true,
  })
  @JoinColumn({ name: 'order_id' })
  order: Order | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Online Order', nullable: true })
  @Column({ name: 'online_order_id', nullable: true })
  online_order_id: number | null;

  @ManyToOne(() => OnlineOrder, {
    nullable: true,
  })
  @JoinColumn({ name: 'online_order_id' })
  onlineOrder: OnlineOrder | null;

  @ApiProperty({ example: 1, description: 'Identifier of the Kitchen Station', nullable: true })
  @Column({ name: 'station_id', nullable: true })
  station_id: number | null;

  @ManyToOne(() => KitchenStation, {
    nullable: true,
  })
  @JoinColumn({ name: 'station_id' })
  station: KitchenStation | null;

  @ApiProperty({ example: 1, description: 'Priority of the order (higher number = higher priority)' })
  @Column({ type: 'int', default: 0 })
  priority: number;

  @ApiProperty({
    example: KitchenOrderBusinessStatus.PENDING,
    enum: KitchenOrderBusinessStatus,
    description: 'Business status of the kitchen order (pending, started, completed, cancelled)',
  })
  @Column({ type: 'varchar', length: 50, name: 'business_status', default: KitchenOrderBusinessStatus.PENDING })
  business_status: KitchenOrderBusinessStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Timestamp when the order was started', nullable: true })
  @Column({ type: 'timestamp', name: 'started_at', nullable: true })
  started_at: Date | null;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Timestamp when the order was completed', nullable: true })
  @Column({ type: 'timestamp', name: 'completed_at', nullable: true })
  completed_at: Date | null;

  @ApiProperty({ example: 'Extra sauce on the side', description: 'Notes about the kitchen order', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ApiProperty({
    example: KitchenOrderStatus.ACTIVE,
    enum: KitchenOrderStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: KitchenOrderStatus,
    default: KitchenOrderStatus.ACTIVE,
  })
  status: KitchenOrderStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
