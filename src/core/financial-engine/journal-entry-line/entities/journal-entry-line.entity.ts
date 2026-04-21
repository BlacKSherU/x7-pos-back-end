import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { JournalEntry } from '../../journal-entry/entities/journal-entry.entity';
import { LedgerAccount } from '../../ledger-accounts/entities/ledger-account.entity';

@Entity('journal_entry_lines')
export class JournalEntryLine {
  @ApiProperty({ example: 1, description: 'Journal Entry Line ID' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'Journal Entry ID' })
  @Column({ type: 'int' })
  journal_entry_id: number;

  @ManyToOne(() => JournalEntry, (entry) => entry.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'journal_entry_id' })
  journal_entry: JournalEntry;

  @ApiProperty({ example: 1, description: 'Ledger Account ID' })
  @Column({ type: 'int' })
  account_id: number;

  @ManyToOne(() => LedgerAccount, { onDelete: 'RESTRICT', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: LedgerAccount;

  @ApiProperty({
    example: 1000.0,
    description: 'Debit amount (0 if credit line)',
  })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  debit: number;

  @ApiProperty({ example: 0.0, description: 'Credit amount (0 if debit line)' })
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  credit: number;

  @ApiProperty({
    example: 'Cash payment received',
    description: 'Optional description for this line',
    required: false,
  })
  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;
}
