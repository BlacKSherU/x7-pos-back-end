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
import { SupplierPaymentStatus } from '../constants/supplier-payment-status.enum';
import { SupplierPaymentItem } from '../../supplier-payment-items/entities/supplier-payment-item.entity';
import { SupplierPaymentAllocation } from '../../supplier_payment_allocations/entities/supplier_payment_allocation.entity';

@Entity('supplier_payments')
export class SupplierPayment {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 10, description: 'Company owner of the payment' })
  @Column({ type: 'int', name: 'company_id' })
  company_id: number;

  @ApiProperty({ example: 5, description: 'Supplier receiving the payment' })
  @Column({ type: 'int', name: 'supplier_id' })
  supplier_id: number;

  @ApiProperty({ example: 'PAY-000123' })
  @Column({ type: 'varchar', length: 100, name: 'payment_number' })
  payment_number: string;

  @ApiProperty({ example: '2026-03-03' })
  @Column({ type: 'date', name: 'payment_date' })
  payment_date: Date;

  @ApiProperty({ example: 'bank_transfer' })
  @Column({ type: 'varchar', length: 50, name: 'payment_method' })
  payment_method: string;

  @ApiProperty({ example: 'TRX-998877', nullable: true })
  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @ApiProperty({ example: 2500.0 })
  @Column({ type: 'decimal', precision: 15, scale: 2, name: 'total_amount' })
  total_amount: number;

  @ApiProperty({ example: 1000.0, default: 0 })
  @Column({
    type: 'decimal',
    precision: 15,
    scale: 2,
    name: 'allocated_amount',
    default: 0,
  })
  allocated_amount: number;

  @ApiProperty({ enum: SupplierPaymentStatus })
  @Column({
    type: 'enum',
    enum: SupplierPaymentStatus,
    default: SupplierPaymentStatus.DRAFT,
  })
  status: SupplierPaymentStatus;

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

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => SupplierPaymentItem, (item) => item.payment)
  items: SupplierPaymentItem[];

  @OneToMany(() => SupplierPaymentAllocation, (allocation) => allocation.payment)
  allocations: SupplierPaymentAllocation[];
}
