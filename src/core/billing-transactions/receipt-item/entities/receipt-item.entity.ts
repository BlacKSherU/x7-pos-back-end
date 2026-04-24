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
import { Receipt } from '../../receipts/entities/receipt.entity';

@Entity('receipt_items')
export class ReceiptItem {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10 })
  @Column({ type: 'int', name: 'receipt_id' })
  receipt_id: number;

  @ApiProperty({ example: 'Burger Combo' })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({ example: 'SKU-001' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  sku?: string;

  @ApiProperty({ example: 2 })
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantity: number;

  @ApiProperty({ example: 12.5 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unit_price: number;

  @ApiProperty({ example: 25.0 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @ApiProperty({ example: 2.5 })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount_amount: number;

  @ApiProperty({ example: 22.5 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @ApiProperty({ example: '{"notes":"No onions"}' })
  @Column({ type: 'text', nullable: true })
  metadata?: string;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({ example: true, description: 'Whether the item is active' })
  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active: boolean;

  @ManyToOne(() => Receipt, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receipt_id' })
  receipt: Receipt;
}
