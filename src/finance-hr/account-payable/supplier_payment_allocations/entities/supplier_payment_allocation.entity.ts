import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SupplierPayment } from '../../supplier-payments/entities/supplier-payment.entity';
import { SupplierCreditNote } from '../../supplier-credit-notes/entities/supplier-credit-note.entity';

@Entity('supplier_payment_allocations')
export class SupplierPaymentAllocation {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', name: 'payment_id' })
  payment_id: number;

  @ApiProperty({ example: 4, nullable: true })
  @Column({ type: 'int', name: 'credit_note_id', nullable: true })
  credit_note_id?: number | null;

  @ApiProperty({ example: 5 })
  @Column({ type: 'int', name: 'supplier_id' })
  supplier_id: number;

  @ApiProperty({ example: 'INV-2026-001' })
  @Column({ type: 'varchar', length: 100, name: 'document_number' })
  document_number: string;

  @ApiProperty({ example: 'invoice' })
  @Column({ type: 'varchar', length: 50, name: 'document_type' })
  document_type: string;

  @ApiProperty({ example: 350.0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'allocated_amount',
  })
  allocated_amount: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => SupplierPayment, (payment) => payment.allocations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: SupplierPayment;

  @ManyToOne(() => SupplierCreditNote, (creditNote) => creditNote.allocations, {
    nullable: true,
  })
  @JoinColumn({ name: 'credit_note_id' })
  credit_note?: SupplierCreditNote;
}
