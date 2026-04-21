import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { JournalEntryStatus } from '../constants/journal-entry-status.enum';
import { JournalEntryReferenceType } from '../constants/journal-entry-reference-type.enum';

export class JournalEntryLineResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: { id: 1, code: '1000', name: 'Cash' } })
  account: { id: number; code: string; name: string } | null;

  @ApiProperty({ example: 1000.0 })
  debit: number;

  @ApiProperty({ example: 0.0 })
  credit: number;

  @ApiProperty({ example: 'Cash payment received', nullable: true })
  description: string | null;
}

export class JournalEntryResponseDto {
  @ApiProperty({ example: 1, description: 'Journal Entry ID' })
  id: number;

  @ApiProperty({ example: 'JE-2024-0001' })
  entry_number: string;

  @ApiProperty({ example: '2024-01-15' })
  entry_date: Date;

  @ApiProperty({ example: 'Monthly payroll', nullable: true })
  description: string | null;

  @ApiProperty({ example: JournalEntryStatus.DRAFT, enum: JournalEntryStatus })
  status: JournalEntryStatus;

  @ApiProperty({ example: 1500.0 })
  total_debit: number;

  @ApiProperty({ example: 1500.0 })
  total_credit: number;

  @ApiProperty({
    example: true,
    description: 'Whether total_debit equals total_credit',
  })
  is_balanced: boolean;

  @ApiProperty({
    example: JournalEntryReferenceType.ORDER,
    enum: JournalEntryReferenceType,
    nullable: true,
  })
  reference_type: JournalEntryReferenceType | null;

  @ApiProperty({ example: 42, nullable: true })
  reference_id: number | null;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  created_at: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00Z' })
  updated_at: Date;

  @ApiProperty({ example: { id: 1, name: 'Acme Corp' }, nullable: true })
  company: { id: number; name: string } | null;

  @ApiProperty({ type: [JournalEntryLineResponseDto] })
  lines: JournalEntryLineResponseDto[];
}

export class JournalEntryLittleResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'JE-2024-0001' })
  entry_number: string;

  @ApiProperty({ example: JournalEntryStatus.DRAFT, enum: JournalEntryStatus })
  status: JournalEntryStatus;

  @ApiProperty({ example: '2024-01-15' })
  entry_date: Date;
}

export class OneJournalEntryResponse extends SuccessResponse {
  @ApiProperty({ type: () => JournalEntryResponseDto })
  data: JournalEntryResponseDto;
}
