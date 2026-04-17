import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { SupplierCreditNoteStatus } from '../entities/supplier-credit-note.entity';

export class CreateSupplierCreditNoteDto {
  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  company_id: number;

  @ApiProperty({ example: 5 })
  @IsNumber()
  @IsPositive()
  supplier_id: number;

  @ApiProperty({ example: 'CN-2026-010' })
  @IsString()
  @MaxLength(100)
  credit_note_number: string;

  @ApiProperty({ example: '2026-03-03' })
  @IsDateString()
  issue_date: string;

  @ApiProperty({ example: 120.0 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  total_amount: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  applied_amount?: number;

  @ApiPropertyOptional({
    enum: SupplierCreditNoteStatus,
    example: SupplierCreditNoteStatus.DRAFT,
    default: SupplierCreditNoteStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(SupplierCreditNoteStatus)
  status?: SupplierCreditNoteStatus;
}
