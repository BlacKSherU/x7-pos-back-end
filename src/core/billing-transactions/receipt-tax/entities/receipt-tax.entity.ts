import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Receipt } from '../../receipts/entities/receipt.entity';
import { ReceiptItem } from '../../receipt-item/entities/receipt-item.entity';
import { ReceiptTaxScope } from '../constants/receipt-tax-scope.enum';

@Entity('receipt_taxes')
export class ReceiptTax {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10 })
  @Column({ type: 'int', name: 'receipt_id' })
  receipt_id: number;

  @ApiProperty({ example: 5, required: false })
  @Column({ type: 'int', name: 'receipt_item_id', nullable: true })
  receipt_item_id?: number | null;

  @ApiProperty({ example: 'IVA 19%' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({ example: 19 })
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  rate: number;

  @ApiProperty({ example: 4.28 })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ enum: ReceiptTaxScope })
  @Column({ type: 'enum', enum: ReceiptTaxScope })
  scope: ReceiptTaxScope;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ example: true, description: 'Whether the tax is active' })
  @Column({ type: 'boolean', name: 'is_active', default: true })
  is_active: boolean;

  @ManyToOne(() => Receipt, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'receipt_id' })
  receipt: Receipt;

  @ManyToOne(() => ReceiptItem, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'receipt_item_id' })
  receiptItem?: ReceiptItem;
}
