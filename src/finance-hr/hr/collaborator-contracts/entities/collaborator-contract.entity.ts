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
import { Collaborator } from '../../collaborators/entities/collaborator.entity';
import { ContractType } from '../constants/contract-type.enum';

@Entity('collaborator_contracts')
export class CollaboratorContract {
  @ApiProperty({ example: 1, description: 'Unique identifier of the contract' })
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

  @ApiProperty({ example: 1, description: 'Collaborator ID' })
  @Column({ name: 'collaborator_id' })
  collaborator_id: number;

  @ManyToOne(() => Collaborator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({
    example: ContractType.HOURLY,
    enum: ContractType,
    description: 'Type of contract: hourly, salary, or mixed',
  })
  @Column({ type: 'varchar', length: 50, name: 'contract_type' })
  contract_type: ContractType;

  @ApiProperty({
    example: 500000,
    description: 'Base salary (for salary/mixed)',
  })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'base_salary',
    default: 0,
  })
  base_salary: number;

  @ApiProperty({ example: 5000, description: 'Hourly rate (for hourly/mixed)' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'hourly_rate',
    default: 0,
  })
  hourly_rate: number;

  @ApiProperty({ example: 1.5, description: 'Overtime multiplier (e.g. 1.5)' })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'overtime_multiplier',
    default: 1.5,
  })
  overtime_multiplier: number;

  @ApiProperty({ example: 2.0, description: 'Double overtime multiplier' })
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    name: 'double_overtime_multiplier',
    default: 2.0,
  })
  double_overtime_multiplier: number;

  @ApiProperty({
    example: true,
    description: 'Whether tips are included in payroll',
  })
  @Column({ type: 'boolean', name: 'tips_included_in_payroll', default: false })
  tips_included_in_payroll: boolean;

  @ApiProperty({ example: true, description: 'Whether the contract is active' })
  @Column({ type: 'boolean', default: true })
  active: boolean;

  @ApiProperty({ example: '2024-01-01', description: 'Contract start date' })
  @Column({ type: 'date', name: 'start_date' })
  start_date: Date;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Contract end date (optional)',
    nullable: true,
  })
  @Column({ type: 'date', name: 'end_date', nullable: true })
  end_date: Date | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
