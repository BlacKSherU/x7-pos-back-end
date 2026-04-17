import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { SupplierCreditNoteStatus } from '../entities/supplier-credit-note.entity';

export class SupplierCreditNoteResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  company_id: number;

  @ApiProperty({ example: 5 })
  supplier_id: number;

  @ApiProperty({ example: 'CN-2026-010' })
  credit_note_number: string;

  @ApiProperty({ example: '2026-03-03' })
  issue_date: string;

  @ApiProperty({ example: 120.0 })
  total_amount: number;

  @ApiProperty({ example: 20.0 })
  applied_amount: number;

  @ApiProperty({ enum: SupplierCreditNoteStatus })
  status: SupplierCreditNoteStatus;

  @ApiProperty({ example: '2026-03-03T10:30:00.000Z' })
  created_at: string;

  @ApiProperty({ example: '2026-03-03T10:30:00.000Z' })
  updated_at: string;
}

export class OneSupplierCreditNoteResponseDto extends SuccessResponse {
  @ApiProperty({ type: SupplierCreditNoteResponseDto })
  data: SupplierCreditNoteResponseDto;
}
