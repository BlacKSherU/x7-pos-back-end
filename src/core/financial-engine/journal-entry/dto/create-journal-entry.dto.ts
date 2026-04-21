import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JournalEntryStatus } from '../constants/journal-entry-status.enum';
import { JournalEntryReferenceType } from '../constants/journal-entry-reference-type.enum';
import { CreateJournalEntryLineDto } from '../../journal-entry-line/dto/create-journal-entry-line.dto';

export class CreateJournalEntryDto {
  @ApiProperty({ example: 'JE-2024-0001', description: 'Unique entry number' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  entry_number: string;

  @ApiProperty({
    example: '2024-01-15',
    description: 'Entry date (YYYY-MM-DD)',
  })
  @IsDateString()
  @IsNotEmpty()
  entry_date: string;

  @ApiPropertyOptional({
    example: 'Monthly payroll expense',
    description: 'Entry description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: JournalEntryStatus.DRAFT,
    enum: JournalEntryStatus,
    description: 'Entry status (default: draft)',
  })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiPropertyOptional({
    example: JournalEntryReferenceType.ORDER,
    enum: JournalEntryReferenceType,
    description: 'Reference type (ORDER, PAYMENT, PAYROLL, etc.)',
  })
  @IsOptional()
  @IsEnum(JournalEntryReferenceType)
  reference_type?: JournalEntryReferenceType;

  @ApiPropertyOptional({
    example: 42,
    description: 'ID of the referenced object',
  })
  @ValidateIf(
    (o) =>
      o.reference_type && o.reference_type !== JournalEntryReferenceType.MANUAL,
  )
  @IsNotEmpty({
    message:
      'reference_id is required when reference_type is provided and is not MANUAL',
  })
  @IsNumber()
  @IsPositive()
  reference_id?: number;

  @ApiProperty({
    type: [CreateJournalEntryLineDto],
    description:
      'Journal entry lines (must balance: sum(debit) === sum(credit))',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines: CreateJournalEntryLineDto[];
}
