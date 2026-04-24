import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../../orders/entities/order.entity';

@Entity('order_payments')
export class OrderPayment {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ name: 'order_id' })
  order_id: number;

  @ManyToOne(() => Order, (order) => order.orderPayments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ApiProperty({ example: 99.5 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ example: 'card', description: 'cash, card, online, qr, etc.' })
  @Column({ type: 'varchar', length: 50 })
  method: string;

  @ApiPropertyOptional({
    example: 'stripe',
    description: 'clover, stripe, transbank',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  @ApiPropertyOptional({ description: 'External transaction id' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @ApiProperty({ example: 0 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tip_amount: number;

  @ApiProperty({ example: false })
  @Column({ default: false })
  is_refund: boolean;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
