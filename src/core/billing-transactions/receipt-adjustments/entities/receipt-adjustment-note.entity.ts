import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Receipt } from '../../receipts/entities/receipt.entity';
import { AdjustmentNoteType } from '../constants/adjustment-note-type.enum';
import { AdjustmentReasonCode } from '../constants/adjustment-reason-code.enum';

/**
 * Nota de crédito / débito sobre un recibo fiscalmente bloqueado (Historia 7).
 *
 * El recibo original es inmutable: la nota es un asiento compensatorio que referencia su
 * invoice_number, registra el delta (adjustment_amount, con el signo que da note_type) y el
 * pasivo neto resultante del recibo tras emitirla. Las notas tampoco se editan ni se borran.
 */
@Entity('receipt_adjustment_notes')
@Index(
  'UQ_receipt_adjustment_notes_merchant_note_number',
  ['merchant_id', 'note_number'],
  {
    unique: true,
  },
)
@Index('IDX_receipt_adjustment_notes_receipt_created', [
  'receipt_id',
  'created_at',
  'id',
])
export class ReceiptAdjustmentNote {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10 })
  @Column({ type: 'int', name: 'receipt_id' })
  receipt_id: number;

  @ManyToOne(() => Receipt, { onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'receipt_id',
    foreignKeyConstraintName: 'FK_receipt_adjustment_notes_receipt_id',
  })
  receipt?: Receipt;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({ enum: AdjustmentNoteType })
  @Column({ type: 'varchar', length: 20, name: 'note_type' })
  note_type: AdjustmentNoteType;

  @ApiProperty({ example: 'CN-000001' })
  @Column({ type: 'varchar', length: 50, name: 'note_number' })
  note_number: string;

  @ApiProperty({ example: 'INV-000010', nullable: true })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'original_invoice_number',
    nullable: true,
  })
  original_invoice_number: string | null;

  @ApiProperty({ example: 25.5 })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'adjustment_amount',
  })
  adjustment_amount: number;

  @ApiProperty({ example: 93.5 })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'resulting_net_amount',
  })
  resulting_net_amount: number;

  @ApiProperty({ example: 'USD' })
  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @ApiProperty({ enum: AdjustmentReasonCode })
  @Column({ type: 'varchar', length: 40, name: 'reason_code' })
  reason_code: AdjustmentReasonCode;

  @ApiProperty({ example: 7 })
  @Column({ type: 'int', name: 'processed_by_user_id' })
  processed_by_user_id: number;

  @ApiProperty({ example: 'merchant_admin' })
  @Column({ type: 'varchar', length: 50, name: 'processed_by_role' })
  processed_by_role: string;

  @ApiProperty({ example: '2026-11-22T10:15:30.123Z' })
  @CreateDateColumn({
    type: 'timestamp',
    precision: 6,
    name: 'created_at',
    default: () => 'clock_timestamp()',
  })
  created_at: Date;
}
