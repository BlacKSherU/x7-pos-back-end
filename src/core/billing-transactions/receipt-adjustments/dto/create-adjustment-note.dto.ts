import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, Max, Min } from 'class-validator';
import { AdjustmentNoteType } from '../constants/adjustment-note-type.enum';
import { AdjustmentReasonCode } from '../constants/adjustment-reason-code.enum';

/** Mayor importe de una columna decimal(12,2). */
export const ADJUSTMENT_MAX_AMOUNT = 9_999_999_999.99;

/** Cuerpo de POST /billing/receipts/:id/adjustments (el recibo llega en la ruta). */
export class CreateAdjustmentNoteDto {
  @ApiProperty({
    enum: AdjustmentNoteType,
    example: AdjustmentNoteType.CREDIT_NOTE,
    description:
      'CREDIT_NOTE reduces the net liability of the receipt; DEBIT_NOTE increases it',
  })
  @IsEnum(AdjustmentNoteType)
  @IsNotEmpty()
  noteType: AdjustmentNoteType;

  @ApiProperty({
    example: 25.5,
    description:
      'Adjustment delta (decimal(12,2): > 0, at most 2 decimal places). It cannot exceed the grand_total of the original receipt, and all credit notes of a receipt together cannot exceed it either.',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsNotEmpty()
  @Min(0.01)
  @Max(ADJUSTMENT_MAX_AMOUNT)
  adjustmentAmount: number;

  @ApiProperty({
    enum: AdjustmentReasonCode,
    example: AdjustmentReasonCode.PARTIAL_RETURN,
  })
  @IsEnum(AdjustmentReasonCode)
  @IsNotEmpty()
  reasonCode: AdjustmentReasonCode;
}
