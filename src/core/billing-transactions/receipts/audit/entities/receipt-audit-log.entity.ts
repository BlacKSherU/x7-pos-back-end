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
import { Receipt } from '../../entities/receipt.entity';
import { ReceiptAuditAction } from '../receipt-audit-action.enum';

/** Totales críticos del recibo antes / después de un evento (importes con 2 decimales). */
export interface ReceiptTotalsSnapshot {
  subtotal: number;
  total_tax: number;
  total_discount: number;
  grand_total: number;
}

/**
 * Audit trail de un recibo (Historia 6): un registro inmutable por evento del ciclo de vida
 * (alta, edición, bloqueo, cambios de líneas / impuestos, baja, intentos bloqueados, notas de
 * ajuste), con el usuario y el rol que lo ejecutan y los totales antes y después.
 *
 * created_at es timestamp(6) con DEFAULT clock_timestamp(): la hora real de cada inserción
 * (no la del inicio de la transacción), con precisión de microsegundos. El orden cronológico
 * exacto es (created_at, id).
 */
@Entity('receipt_audit_logs')
@Index('IDX_receipt_audit_logs_receipt_created', [
  'receipt_id',
  'created_at',
  'id',
])
export class ReceiptAuditLog {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10 })
  @Column({ type: 'int', name: 'receipt_id' })
  receipt_id: number;

  @ManyToOne(() => Receipt, {
    onDelete: 'CASCADE',
    createForeignKeyConstraints: true,
  })
  @JoinColumn({
    name: 'receipt_id',
    foreignKeyConstraintName: 'FK_receipt_audit_logs_receipt_id',
  })
  receipt?: Receipt;

  @ApiProperty({ example: 1 })
  @Column({ type: 'int', name: 'merchant_id' })
  merchant_id: number;

  @ApiProperty({ enum: ReceiptAuditAction, example: ReceiptAuditAction.LOCKED })
  @Column({ type: 'varchar', length: 40 })
  action: ReceiptAuditAction;

  @ApiProperty({ example: 7, nullable: true })
  @Column({ type: 'int', name: 'user_id', nullable: true })
  user_id: number | null;

  @ApiProperty({ example: 'merchant_admin', nullable: true })
  @Column({ type: 'varchar', length: 50, nullable: true })
  role: string | null;

  @Column({ type: 'jsonb', name: 'previous_values', nullable: true })
  previous_values: ReceiptTotalsSnapshot | null;

  @Column({ type: 'jsonb', name: 'new_values', nullable: true })
  new_values: ReceiptTotalsSnapshot | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ example: '2026-11-22T10:15:30.123Z' })
  @CreateDateColumn({
    type: 'timestamp',
    precision: 6,
    name: 'created_at',
    default: () => 'clock_timestamp()',
  })
  created_at: Date;
}
