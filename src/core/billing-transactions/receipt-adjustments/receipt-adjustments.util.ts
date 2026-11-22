import { BadRequestException } from '@nestjs/common';
import {
  DecimalInput,
  centsToNumber,
  formatScaled,
  toCents,
} from '../receipts/utils/receipt-money.util';
import {
  ADJUSTMENT_NOTE_PREFIX,
  AdjustmentNoteType,
} from './constants/adjustment-note-type.enum';

/** Mensaje del 400 cuando el recibo no está bloqueado (o está dado de baja). */
export const ADJUSTMENT_REQUIRES_LOCK_MESSAGE =
  'Adjustment notes can only be issued for fiscally locked receipts.';

export interface AdjustmentNoteAmounts {
  note_type: AdjustmentNoteType;
  adjustment_amount: DecimalInput;
}

/** Totales de las notas de un recibo, en centavos exactos. */
export interface AdjustmentTotalsCents {
  grandTotal: bigint;
  credited: bigint;
  debited: bigint;
  /** grand_total − créditos + débitos. */
  net: bigint;
}

/** Pasivo neto del recibo según sus notas (aritmética exacta en centavos). */
export function adjustmentTotals(
  grandTotal: DecimalInput,
  notes: readonly AdjustmentNoteAmounts[],
): AdjustmentTotalsCents {
  let credited = 0n;
  let debited = 0n;
  for (const note of notes) {
    const cents = toCents(note.adjustment_amount);
    if (note.note_type === AdjustmentNoteType.CREDIT_NOTE) credited += cents;
    else debited += cents;
  }
  const grand = toCents(grandTotal);
  return {
    grandTotal: grand,
    credited,
    debited,
    net: grand - credited + debited,
  };
}

/** Delta con signo sobre el pasivo neto: negativo para notas de crédito. */
export function signedAdjustment(note: AdjustmentNoteAmounts): number {
  const cents = toCents(note.adjustment_amount);
  return centsToNumber(
    note.note_type === AdjustmentNoteType.CREDIT_NOTE ? -cents : cents,
  );
}

/**
 * Valida una nota nueva contra el recibo y las notas ya emitidas y devuelve el delta y el
 * pasivo neto resultante (centavos):
 * - importe > 0 y ≤ grand_total del recibo original;
 * - notas de crédito acumuladas (incluida esta) ≤ grand_total.
 */
export function evaluateAdjustment(
  grandTotal: DecimalInput,
  existing: readonly AdjustmentNoteAmounts[],
  noteType: AdjustmentNoteType,
  amount: DecimalInput,
): { amountCents: bigint; netAfterCents: bigint } {
  const amountCents = toCents(amount);
  if (amountCents <= 0n) {
    throw new BadRequestException('adjustmentAmount must be greater than 0');
  }
  const totals = adjustmentTotals(grandTotal, existing);
  if (amountCents > totals.grandTotal) {
    throw new BadRequestException(
      `adjustmentAmount (${formatScaled(amountCents, 2)}) cannot exceed the receipt grand_total (${formatScaled(totals.grandTotal, 2)})`,
    );
  }
  if (noteType === AdjustmentNoteType.CREDIT_NOTE) {
    const available = totals.grandTotal - totals.credited;
    if (amountCents > available) {
      throw new BadRequestException(
        `Credit notes cannot exceed the receipt grand_total (${formatScaled(totals.grandTotal, 2)}): ${formatScaled(totals.credited, 2)} already credited, ${formatScaled(available, 2)} available`,
      );
    }
  }
  const netAfterCents =
    noteType === AdjustmentNoteType.CREDIT_NOTE
      ? totals.net - amountCents
      : totals.net + amountCents;
  return { amountCents, netAfterCents };
}

/** Siguiente número de nota del merchant: CN-000001, DN-000002… (6 dígitos mínimo). */
export function formatNoteNumber(
  noteType: AdjustmentNoteType,
  sequence: number,
): string {
  return `${ADJUSTMENT_NOTE_PREFIX[noteType]}-${sequence.toString().padStart(6, '0')}`;
}
