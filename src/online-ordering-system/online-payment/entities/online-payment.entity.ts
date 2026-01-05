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
import { OnlineOrderPaymentStatus } from '../../online-order/constants/online-order-payment-status.enum';
import { OnlinePaymentStatus } from '../constants/online-payment-status.enum';

@Entity('online_payment')
@Index(['online_order_id'])
@Index(['status'])
@Index(['logical_status'])
export class OnlinePayment {
  @ApiProperty({ example: 1, description: 'Unique identifier of the Online Payment' })
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

  @ApiProperty({ example: 'stripe', description: 'Payment provider name (e.g., stripe, paypal, square)' })
  @Column({ type: 'varchar', length: 50, name: 'payment_provider' })
  payment_provider: string;

  @ApiProperty({ example: 'txn_1234567890', description: 'Transaction ID from the payment provider' })
  @Column({ type: 'varchar', length: 100, name: 'transaction_id' })
  transaction_id: string;

  @ApiProperty({ example: 125.99, description: 'Payment amount' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({
    example: OnlineOrderPaymentStatus.PAID,
    enum: OnlineOrderPaymentStatus,
    description: 'Payment status (pending, paid, failed, refunded)',
  })
  @Column({ type: 'varchar', length: 20 })
  status: OnlineOrderPaymentStatus;

  @ApiProperty({ example: '2024-01-15T08:30:00Z', description: 'Timestamp when the payment was processed', nullable: true })
  @Column({ type: 'timestamp', name: 'processed_at', nullable: true })
  processed_at: Date | null;

  @ApiProperty({
    example: OnlinePaymentStatus.ACTIVE,
    enum: OnlinePaymentStatus,
    description: 'Logical status for deletion (active, deleted)',
  })
  @Column({
    type: 'enum',
    enum: OnlinePaymentStatus,
    default: OnlinePaymentStatus.ACTIVE,
    name: 'logical_status',
  })
  logical_status: OnlinePaymentStatus;

  @ApiProperty({ example: '2024-01-15T08:00:00Z', description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z', description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
