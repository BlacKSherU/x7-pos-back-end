import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { PayrollEntry } from '../../payroll-entries/entities/payroll-entry.entity';
import { AdjustmentType } from '../constants/adjustment-type.enum';

@Entity('payroll_adjustments')
export class PayrollAdjustment {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the payroll adjustment',
  })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Identifier of the payroll entry' })
  @Column({ name: 'payroll_entry_id' })
  payroll_entry_id: number;

  @ApiProperty({
    type: () => PayrollEntry,
    description: 'Payroll entry associated with this adjustment',
  })
  @ManyToOne(() => PayrollEntry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payroll_entry_id' })
  payrollEntry: PayrollEntry;

  @ApiProperty({
    example: AdjustmentType.BONUS,
    enum: AdjustmentType,
    description: 'Type of adjustment: bonus or deduction',
  })
  @Column({ type: 'varchar', length: 50, name: 'adjustment_type' })
  adjustment_type: AdjustmentType;

  @ApiProperty({
    example: 'Performance bonus',
    description: 'Description of the adjustment',
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({
    example: 150.5,
    description:
      'Adjustment amount (positive for bonus, negative for deduction)',
  })
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updated_at: Date;

  @ApiProperty({
    description: 'Logical delete timestamp (null = active)',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'deleted_at', nullable: true })
  deleted_at: Date | null;
}
