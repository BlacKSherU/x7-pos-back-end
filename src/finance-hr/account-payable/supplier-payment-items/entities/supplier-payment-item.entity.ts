import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SupplierPayment } from '../../supplier-payments/entities/supplier-payment.entity';

@Entity('supplier_payment_items')
export class SupplierPaymentItem {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', name: 'payment_id' })
  payment_id: number;

  @ApiProperty({
    example: 'INV-2025-001',
    description: 'Invoice or document number',
  })
  @Column({ type: 'varchar', length: 100, name: 'document_number' })
  document_number: string;

  @ApiProperty({
    example: 'invoice',
    description: 'invoice, debit_note, adjustment, advance, etc.',
  })
  @Column({ type: 'varchar', length: 50, name: 'document_type' })
  document_type: string;

  @ApiProperty({ example: 500.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @ApiProperty({
    description: 'Logical delete timestamp (null = active)',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => SupplierPayment, (payment) => payment.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: SupplierPayment;
}
