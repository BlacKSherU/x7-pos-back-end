import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Supplier } from 'src/core/business-partners/suppliers/entities/supplier.entity';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { SupplierInvoiceStatus } from '../constants/supplier-invoice-status.enum';
import { SupplierInvoiceItem } from '../../supplier-invoice-item/entities/supplier-invoice-item.entity';

@Entity('supplier_invoices')
export class SupplierInvoice {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10, description: 'Company owner of the invoice' })
  @Column({ type: 'int', name: 'company_id' })
  company_id: number;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ApiProperty({ example: 5 })
  @Column({ type: 'int', name: 'supplier_id' })
  supplier_id: number;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ApiProperty({ example: 'INV-4567' })
  @Column({ type: 'varchar', length: 100, name: 'invoice_number' })
  invoice_number: string;

  @ApiProperty({ example: '2025-03-01' })
  @Column({ type: 'date', name: 'invoice_date' })
  invoice_date: Date;

  @ApiProperty({ example: '2025-03-31' })
  @Column({ type: 'date', name: 'due_date' })
  due_date: Date;

  @ApiProperty({ example: 1000.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  subtotal: number;

  @ApiProperty({ example: 190.0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'tax_total',
    default: 0,
  })
  tax_total: number;

  @ApiProperty({ example: 1190.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_amount' })
  total_amount: number;

  @ApiProperty({ example: 400.0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'paid_amount',
    default: 0,
  })
  paid_amount: number;

  @ApiProperty({ example: 790.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'balance_due' })
  balance_due: number;

  @ApiProperty({ enum: SupplierInvoiceStatus })
  @Column({
    type: 'varchar',
    length: 50,
    default: SupplierInvoiceStatus.PENDING,
  })
  status: SupplierInvoiceStatus;

  @ApiProperty({ example: 'Optional notes', nullable: true })
  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    description: 'Logical delete timestamp (null = active)',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;

  @OneToMany(() => SupplierInvoiceItem, (item) => item.invoice)
  items: SupplierInvoiceItem[];
}
