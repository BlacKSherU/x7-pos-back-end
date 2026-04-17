import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SupplierPaymentAllocation } from '../../supplier_payment_allocations/entities/supplier_payment_allocation.entity';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';

export enum SupplierCreditNoteStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  PARTIALLY_APPLIED = 'partially_applied',
  FULLY_APPLIED = 'fully_applied',
  CANCELLED = 'cancelled',
}

@Entity('supplier_credit_notes')
export class SupplierCreditNote {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10 })
  @Column({ type: 'int', name: 'company_id' })
  company_id: number;

  @ApiProperty({ example: 5 })
  @Column({ type: 'int', name: 'supplier_id' })
  supplier_id: number;

  @ApiProperty({ example: 'CN-2026-010' })
  @Column({ type: 'varchar', length: 100, name: 'credit_note_number' })
  credit_note_number: string;

  @ApiProperty({ example: '2026-03-03' })
  @Column({ type: 'date', name: 'issue_date' })
  issue_date: Date;

  @ApiProperty({ example: 120.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_amount' })
  total_amount: number;

  @ApiProperty({ example: 0, default: 0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'applied_amount',
    default: 0,
  })
  applied_amount: number;

  @ApiProperty({ enum: SupplierCreditNoteStatus })
  @Column({
    type: 'enum',
    enum: SupplierCreditNoteStatus,
    default: SupplierCreditNoteStatus.DRAFT,
  })
  status: SupplierCreditNoteStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => SupplierPaymentAllocation, (allocation) => allocation.credit_note)
  allocations: SupplierPaymentAllocation[];
}
