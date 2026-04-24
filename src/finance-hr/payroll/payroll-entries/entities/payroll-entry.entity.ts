import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PayrollRun } from '../../payroll-runs/entities/payroll-run.entity';
import { Collaborator } from '../../../hr/collaborators/entities/collaborator.entity';

@Entity('payroll_entries')
export class PayrollEntry {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the payroll entry',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the payroll run' })
  @Column({ name: 'payroll_run_id' })
  payroll_run_id: number;

  @ManyToOne(() => PayrollRun, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_run_id' })
  payrollRun: PayrollRun;

  @ApiProperty({ example: 1, description: 'Identifier of the collaborator' })
  @Column({ name: 'collaborator_id' })
  collaborator_id: number;

  @ManyToOne(() => Collaborator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({ example: 50000.0, description: 'Base pay amount' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'base_pay',
    default: 0,
  })
  base_pay: number;

  @ApiProperty({ example: 7500.0, description: 'Overtime pay amount' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'overtime_pay',
    default: 0,
  })
  overtime_pay: number;

  @ApiProperty({ example: 0, description: 'Double overtime pay amount' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'double_overtime_pay',
    default: 0,
  })
  double_overtime_pay: number;

  @ApiProperty({ example: 15000.0, description: 'Tips amount' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'tips_amount',
    default: 0,
  })
  tips_amount: number;

  @ApiProperty({ example: 5000.0, description: 'Total bonuses' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  bonuses: number;

  @ApiProperty({ example: 2000.0, description: 'Total deductions' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  deductions: number;

  @ApiProperty({ example: 75500.0, description: 'Gross total' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'gross_total',
    default: 0,
  })
  gross_total: number;

  @ApiProperty({ example: 12000.0, description: 'Total tax' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'tax_total',
    default: 0,
  })
  tax_total: number;

  @ApiProperty({ example: 63500.0, description: 'Net total' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'net_total',
    default: 0,
  })
  net_total: number;

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
