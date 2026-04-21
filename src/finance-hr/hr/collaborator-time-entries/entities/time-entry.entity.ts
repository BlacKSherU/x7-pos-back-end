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
import { Shift } from 'src/restaurant-operations/shift/shifts/entities/shift.entity';

@Entity('time_entries')
export class TimeEntry {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the time entry',
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

  @ApiProperty({ example: 1, description: 'Collaborator ID' })
  @Column({ name: 'collaborator_id' })
  collaborator_id: number;

  @ManyToOne(() => Collaborator, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'collaborator_id' })
  collaborator: Collaborator;

  @ApiProperty({ example: 1, description: 'Shift ID' })
  @Column({ name: 'shift_id' })
  shift_id: number;

  @ManyToOne(() => Shift, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @ApiProperty({
    example: '2024-01-15T08:00:00Z',
    description: 'Clock in timestamp',
  })
  @Column({ type: 'timestamp', name: 'clock_in' })
  clock_in: Date;

  @ApiProperty({
    example: '2024-01-15T16:00:00Z',
    description: 'Clock out timestamp',
    nullable: true,
  })
  @Column({ type: 'timestamp', name: 'clock_out', nullable: true })
  clock_out: Date | null;

  @ApiProperty({ example: 8, description: 'Regular hours worked' })
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'regular_hours',
    default: 0,
  })
  regular_hours: number;

  @ApiProperty({ example: 0, description: 'Overtime hours' })
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'overtime_hours',
    default: 0,
  })
  overtime_hours: number;

  @ApiProperty({ example: 0, description: 'Double overtime hours' })
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    name: 'double_overtime_hours',
    default: 0,
  })
  double_overtime_hours: number;

  @ApiProperty({ example: false, description: 'Whether the entry is approved' })
  @Column({ type: 'boolean', default: false })
  approved: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  created_at: Date;
}
