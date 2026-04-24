import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Order } from 'src/restaurant-operations/pos/orders/entities/order.entity';

import { ReceiptType } from '../constants/receipt-type.enum';

@Entity('receipts')
export class Receipt {
  @ApiProperty({ example: 1, description: 'Unique identifier' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    example: 200,
    description: 'Order ID associated to the receipt',
  })
  @Column({ type: 'int', name: 'order_id' })
  order_id: number;

  @ApiProperty({
    example: ReceiptType.INVOICE,
    enum: ReceiptType,
    description: 'Type of receipt',
  })
  @Column({
    type: 'enum',
    enum: ReceiptType,
    default: ReceiptType.RECEIPT,
  })
  type: ReceiptType;

  @ApiProperty({
    example: '{"tax_id": "12345678", "fiscal_number": "ABC123"}',
    description: 'Fiscal data in JSON format',
  })
  @Column({ type: 'text', nullable: true })
  fiscal_data?: string | null;

  @ApiProperty({
    example: 0,
    description: 'Sum of all item subtotals before tax and discount',
    default: 0,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @ApiProperty({
    example: 0,
    description: 'Total tax amount across all receipt taxes',
    default: 0,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_tax: number;

  @ApiProperty({
    example: 0,
    description: 'Total discount amount across all receipt items',
    default: 0,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_discount: number;

  @ApiProperty({
    example: 0,
    description: 'Grand total = subtotal + total_tax - total_discount',
    default: 0,
  })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grand_total: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code (ISO 4217)',
    default: 'USD',
  })
  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @ApiProperty({
    example: false,
    description: 'Whether the receipt has been logically deleted',
    default: false,
  })
  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active: boolean;

  @ApiProperty({ example: '2024-01-15T08:00:00Z' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    type: () => Order,
    required: false,
    description: 'Order associated with this receipt',
  })
  @ManyToOne(() => Order, (order) => order.receipts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;
}
