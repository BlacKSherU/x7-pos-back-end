import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { ReceiptPostingStatus } from '../constants/posting-status.enum';

export class GetFinancialSyncQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, default: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    enum: ReceiptPostingStatus,
    description:
      'POSTED: only posted entries · PENDING: has DRAFT entries · UNPOSTED: no non-voided entries',
  })
  @IsOptional()
  @IsEnum(ReceiptPostingStatus)
  postingStatus?: ReceiptPostingStatus;

  @ApiPropertyOptional({
    example: 'INV-0001',
    description: 'Case-insensitive partial match on invoice_number',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  search?: string;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description: 'Receipts created on or after this date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2026-11-30',
    description: 'Receipts created on or before this date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  dateTo?: string;
}

export class GetFinancialSyncLinesQueryDto {
  @ApiPropertyOptional({
    example: 12,
    description:
      'Only the lines of this journal entry (must be linked to the receipt)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  journalEntryId?: number;
}
