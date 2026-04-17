import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive, Max, Min } from 'class-validator';
import { SupplierCreditNoteStatus } from '../entities/supplier-credit-note.entity';

export enum SupplierCreditNoteSortBy {
  CREATED_AT = 'created_at',
  ISSUE_DATE = 'issue_date',
  CREDIT_NOTE_NUMBER = 'credit_note_number',
  TOTAL_AMOUNT = 'total_amount',
  APPLIED_AMOUNT = 'applied_amount',
  STATUS = 'status',
}

export class GetSupplierCreditNotesQueryDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  company_id?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  supplier_id?: number;

  @ApiPropertyOptional({ enum: SupplierCreditNoteStatus })
  @IsOptional()
  @IsEnum(SupplierCreditNoteStatus)
  status?: SupplierCreditNoteStatus;

  @ApiPropertyOptional({ enum: SupplierCreditNoteSortBy })
  @IsOptional()
  @IsEnum(SupplierCreditNoteSortBy)
  sortBy?: SupplierCreditNoteSortBy;

  @ApiPropertyOptional({ example: 'DESC', enum: ['ASC', 'DESC'] })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC';
}
