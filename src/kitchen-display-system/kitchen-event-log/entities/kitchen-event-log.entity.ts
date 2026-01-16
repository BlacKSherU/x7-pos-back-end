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
import { KitchenOrder } from '../../kitchen-order/entities/kitchen-order.entity';
import { KitchenOrderItem } from '../../kitchen-order-item/entities/kitchen-order-item.entity';
import { KitchenStation } from '../../kitchen-station/entities/kitchen-station.entity';
import { User } from '../../../users/entities/user.entity';
import { KitchenEventLogEventType } from '../constants/kitchen-event-log-event-type.enum';
import { KitchenEventLogStatus } from '../constants/kitchen-event-log-status.enum';

@Entity('kitchen_event_log')
@Index(['kitchen_order_id'])
@Index(['kitchen_order_item_id'])
@Index(['station_id'])
@Index(['user_id'])
@Index(['event_type'])
@Index(['event_time'])
@Index(['status'])
export class KitchenEventLog {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Kitchen Event Log' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Kitchen Order associated with this event',
    nullable: true,
  })
  @Column({ name: 'kitchen_order_id', nullable: true })
  kitchen_order_id: number | null;

  @ApiProperty({
    type: () => KitchenOrder,
    description: 'Kitchen Order associated with this event',
    nullable: true,
  })
  @ManyToOne(() => KitchenOrder, {
    nullable: true,
  })
  @JoinColumn({ name: 'kitchen_order_id' })
  kitchenOrder: KitchenOrder | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Kitchen Order Item associated with this event',
    nullable: true,
  })
  @Column({ name: 'kitchen_order_item_id', nullable: true })
  kitchen_order_item_id: number | null;

  @ApiProperty({
    type: () => KitchenOrderItem,
    description: 'Kitchen Order Item associated with this event',
    nullable: true,
  })
  @ManyToOne(() => KitchenOrderItem, {
    nullable: true,
  })
  @JoinColumn({ name: 'kitchen_order_item_id' })
  kitchenOrderItem: KitchenOrderItem | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the Kitchen Station associated with this event',
    nullable: true,
  })
  @Column({ name: 'station_id', nullable: true })
  station_id: number | null;

  @ApiProperty({
    type: () => KitchenStation,
    description: 'Kitchen Station associated with this event',
    nullable: true,
  })
  @ManyToOne(() => KitchenStation, {
    nullable: true,
  })
  @JoinColumn({ name: 'station_id' })
  station: KitchenStation | null;

  @ApiProperty({
    example: 1,
    description: 'Identifier of the User who triggered this event',
    nullable: true,
  })
  @Column({ name: 'user_id', nullable: true })
  user_id: number | null;

  @ApiProperty({
    type: () => User,
    description: 'User who triggered this event',
    nullable: true,
  })
  @ManyToOne(() => User, {
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @ApiProperty({
    example: KitchenEventLogEventType.INICIO,
    enum: KitchenEventLogEventType,
    description: 'Type of event (inicio, listo, servido, cancelado)',
  })
  @Column({ type: 'varchar', length: 100, name: 'event_type' })
  event_type: KitchenEventLogEventType;

  @ApiProperty({
    example: '2024-01-15T08:30:00Z',
    description: 'Timestamp when the event occurred',
  })
  @Column({ type: 'timestamp', name: 'event_time' })
  event_time: Date;

  @ApiProperty({
    example: 'Order started in kitchen',
    description: 'Message describing the event',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  message: string | null;

  @ApiProperty({
    example: KitchenEventLogStatus.ACTIVE,
    enum: KitchenEventLogStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: KitchenEventLogStatus,
    default: KitchenEventLogStatus.ACTIVE,
  })
  status: KitchenEventLogStatus;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Creation timestamp of the Kitchen Event Log record',
  })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    example: '2024-01-15T09:00:00Z',
    description: 'Last update timestamp of the Kitchen Event Log record',
  })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
