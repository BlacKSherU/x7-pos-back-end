import {
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JournalEntryStatus } from '../constants/journal-entry-status.enum';

export class GetJournalEntriesQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: JournalEntryStatus.DRAFT,
    enum: JournalEntryStatus,
    description: 'Filter by status',
  })
  @IsOptional()
  @IsEnum(JournalEntryStatus)
  status?: JournalEntryStatus;

  @ApiPropertyOptional({
    example: 'ORDER',
    description: 'Filter by reference type',
  })
  @IsOptional()
  @IsString()
  reference_type?: string;
}
