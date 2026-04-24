import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PayrollEntry } from '../../payroll-entries/entities/payroll-entry.entity';

@Entity('payroll_tax_details')
export class PayrollTaxDetail {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the payroll tax detail',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the payroll entry' })
  @Column({ name: 'payroll_entry_id' })
  payroll_entry_id: number;

  @ApiProperty({
    type: () => PayrollEntry,
    description: 'Payroll entry associated with this tax detail',
  })
  @ManyToOne(() => PayrollEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_entry_id' })
  payrollEntry: PayrollEntry;

  @ApiProperty({ example: 'Income tax', description: 'Type of tax' })
  @Column({ type: 'varchar', length: 100, name: 'tax_type' })
  tax_type: string;

  @ApiProperty({ example: 19.0, description: 'Tax percentage' })
  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @ApiProperty({ example: 15000.5, description: 'Tax amount' })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({
    description: 'Logical delete timestamp (null = active)',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;
}
