import { ApiProperty } from '@nestjs/swagger';
import { SuccessResponse } from 'src/common/dtos/success-response.dto';
import { AdjustmentNoteType } from '../constants/adjustment-note-type.enum';
import { AdjustmentReasonCode } from '../constants/adjustment-reason-code.enum';

export class AdjustmentNoteDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiProperty({ example: 1 })
  merchant_id: number;

  @ApiProperty({ enum: AdjustmentNoteType })
  note_type: AdjustmentNoteType;

  @ApiProperty({ example: 'CN-000001', description: 'Unique per merchant' })
  note_number: string;

  @ApiProperty({
    example: 'INV-000010',
    nullable: true,
    description: 'invoice_number of the original (locked) receipt',
  })
  original_invoice_number: string | null;

  @ApiProperty({ example: 25.5, description: 'Adjustment delta (always > 0)' })
  adjustment_amount: number;

  @ApiProperty({
    example: -25.5,
    description: 'Signed delta on the net liability: negative for credit notes',
  })
  signed_amount: number;

  @ApiProperty({
    example: 93.5,
    description: 'Net liability of the receipt right after this note',
  })
  resulting_net_amount: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ enum: AdjustmentReasonCode })
  reason_code: AdjustmentReasonCode;

  @ApiProperty({ example: 7 })
  processed_by_user_id: number;

  @ApiProperty({ example: 'merchant_admin' })
  processed_by_role: string;

  @ApiProperty({ example: '2026-11-22T10:15:30.123Z' })
  created_at: Date;
}

/** Pasivo neto del recibo: grand_total − notas de crédito + notas de débito. */
export class ReceiptAdjustmentSummaryDto {
  @ApiProperty({ example: 10 })
  receipt_id: number;

  @ApiProperty({ example: 'INV-000010', nullable: true })
  invoice_number: string | null;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: true })
  is_locked: boolean;

  @ApiProperty({
    example: 119,
    description: 'Original grand_total (never modified)',
  })
  grand_total: number;

  @ApiProperty({ example: 25.5, description: 'Sum of credit notes' })
  credited_total: number;

  @ApiProperty({ example: 0, description: 'Sum of debit notes' })
  debited_total: number;

  @ApiProperty({
    example: 93.5,
    description: 'grand_total − credited_total + debited_total',
  })
  net_total: number;

  @ApiProperty({
    example: 93.5,
    description:
      'Amount still available for credit notes (grand_total − credited_total)',
  })
  available_credit: number;

  @ApiProperty({ example: 1 })
  notes_count: number;
}

export class IssuedAdjustmentNoteDto {
  @ApiProperty({ type: () => AdjustmentNoteDto })
  note: AdjustmentNoteDto;

  @ApiProperty({ type: () => ReceiptAdjustmentSummaryDto })
  summary: ReceiptAdjustmentSummaryDto;
}

export class IssuedAdjustmentNoteResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => IssuedAdjustmentNoteDto })
  data: IssuedAdjustmentNoteDto;
}

export class ReceiptAdjustmentsDto {
  @ApiProperty({ type: () => ReceiptAdjustmentSummaryDto })
  summary: ReceiptAdjustmentSummaryDto;

  @ApiProperty({
    type: () => [AdjustmentNoteDto],
    description: 'Notes in chronological order (created_at, id)',
  })
  notes: AdjustmentNoteDto[];
}

export class ReceiptAdjustmentsResponseDto extends SuccessResponse {
  @ApiProperty({ type: () => ReceiptAdjustmentsDto })
  data: ReceiptAdjustmentsDto;
}
