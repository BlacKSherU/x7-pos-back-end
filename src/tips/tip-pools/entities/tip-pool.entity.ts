import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Company } from '../../../companies/entities/company.entity';
import { Merchant } from '../../../merchants/entities/merchant.entity';
import { Shift } from '../../../shifts/entities/shift.entity';
import { TipPoolDistributionType } from '../constants/tip-pool-distribution-type.enum';
import { TipPoolStatus } from '../constants/tip-pool-status.enum';
import { TipPoolRecordStatus } from '../constants/tip-pool-record-status.enum';

@Entity('tip_pools')
@Index(['company_id', 'merchant_id', 'shift_id', 'created_at'])
@Index(['status', 'record_status'])
export class TipPool {
  @ApiProperty({ example: 1, description: 'Unique identifier of the tip pool' })
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the Company' })
  @Column({ type: 'bigint', name: 'company_id' })
  company_id: number;

  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ApiProperty({ example: 1, description: 'Identifier of the Merchant' })
  @Column({ type: 'bigint', name: 'merchant_id' })
  merchant_id: number;

  @ManyToOne(() => Merchant, { nullable: false })
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @ApiProperty({ example: 1, description: 'Identifier of the Shift' })
  @Column({ type: 'bigint', name: 'shift_id' })
  shift_id: number;

  @ManyToOne(() => Shift, { nullable: false })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({ example: 'Morning Shift Pool', description: 'Name of the tip pool' })
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @ApiProperty({
    example: TipPoolDistributionType.EQUAL,
    enum: TipPoolDistributionType,
    description: 'Distribution type: equal, percentage, points, role_based',
  })
  @Column({ type: 'varchar', length: 50, name: 'distribution_type' })
  distribution_type: TipPoolDistributionType;

  @ApiProperty({ example: 150.50, description: 'Total amount in the pool' })
  @Column({ type: 'decimal', precision: 12, scale: 2, name: 'total_amount', default: 0 })
  total_amount: number;

  @ApiProperty({
    example: TipPoolStatus.OPEN,
    enum: TipPoolStatus,
    description: 'Pool status: open, closed, settled',
  })
  @Column({ type: 'varchar', length: 50 })
  status: TipPoolStatus;

  @ApiProperty({
    example: TipPoolRecordStatus.ACTIVE,
    enum: TipPoolRecordStatus,
    description: 'Record status for logical deletion',
  })
  @Column({
    type: 'varchar',
    length: 50,
    name: 'record_status',
    default: TipPoolRecordStatus.ACTIVE,
  })
  record_status: TipPoolRecordStatus;

  @ApiProperty({ example: '2024-01-15T10:00:00Z', description: 'When the pool was closed (nullable)' })
  @Column({ type: 'timestamp', name: 'closed_at', nullable: true })
  closed_at: Date | null;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;
}
