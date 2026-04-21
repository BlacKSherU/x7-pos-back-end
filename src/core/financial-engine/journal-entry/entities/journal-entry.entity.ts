import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from 'src/platform-saas/companies/entities/company.entity';
import { JournalEntryLine } from 'src/core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';

import { JournalEntryStatus } from '../constants/journal-entry-status.enum';
import { JournalEntryReferenceType } from '../constants/journal-entry-reference-type.enum';

@Entity('journal_entries')
@Index(['company_id', 'entry_number'], { unique: true })
export class JournalEntry {
  @ApiProperty({ example: 1, description: 'Journal Entry ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Company ID' })
  @Column({ type: 'int' })
  company_id: number;

  @ApiProperty({ example: 'JE-2024-0001', description: 'Unique entry number' })
  @Column({ type: 'varchar', length: 100 })
  entry_number: string;

  @ApiProperty({ example: '2024-01-15', description: 'Date of the entry' })
  @Column({ type: 'date' })
  entry_date: Date;

  @ApiProperty({
    example: 'Monthly payroll expense',
    description: 'Optional description',
    required: false,
    nullable: true,
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @ApiProperty({
    example: JournalEntryStatus.DRAFT,
    description: 'Entry status',
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  @Column({
    type: 'enum',
    enum: JournalEntryStatus,
    default: JournalEntryStatus.DRAFT,
  })
  status: JournalEntryStatus;

  @ApiProperty({ example: 1500.0, description: 'Total debit amount' })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total_debit: number;

  @ApiProperty({ example: 1500.0, description: 'Total credit amount' })
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total_credit: number;

  @ApiProperty({
    example: JournalEntryReferenceType.ORDER,
    description: 'Reference type (e.g. ORDER, PAYMENT, PAYROLL)',
    enum: JournalEntryReferenceType,
    required: false,
    nullable: true,
  })
  @Column({
    type: 'enum',
    enum: JournalEntryReferenceType,
    nullable: true,
  })
  reference_type?: JournalEntryReferenceType;

  @ApiProperty({
    example: 42,
    description: 'ID of the referenced object',
    required: false,
    nullable: true,
  })
  @Column({ type: 'int', nullable: true })
  reference_id?: number;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Creation date',
  })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({
    example: '2024-01-01T00:00:00Z',
    description: 'Last update date',
  })
  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @OneToMany(() => JournalEntryLine, (line) => line.journal_entry, {
    cascade: true,
  })
  lines: JournalEntryLine[];
}
