import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { PayrollRunStatus } from '../constants/payroll-run-status.enum';

@Entity('payroll_runs')
export class PayrollRun {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the payroll run',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Company ID' })
  @Column({ name: 'company_id' })
  company_id: number;

  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ApiProperty({ example: 1, description: 'Merchant ID' })
  @Column({ name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({ example: '2024-01-01', description: 'Period start date' })
  @Column({ type: 'date', name: 'period_start' })
  period_start: Date;

  @ApiProperty({ example: '2024-01-15', description: 'Period end date' })
  @Column({ type: 'date', name: 'period_end' })
  period_end: Date;

  @ApiProperty({
    example: PayrollRunStatus.DRAFT,
    enum: PayrollRunStatus,
    description: 'Status: draft, calculated, approved, paid',
  })
  @Column({ type: 'varchar', length: 50, default: PayrollRunStatus.DRAFT })
  status: PayrollRunStatus;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ description: 'Approval timestamp', nullable: true })
  @Column({ type: 'timestamp', name: 'approved_at', nullable: true })
  approved_at: Date | null;

  @ApiProperty({
    description: 'Logical delete timestamp (null = active)',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;
}
