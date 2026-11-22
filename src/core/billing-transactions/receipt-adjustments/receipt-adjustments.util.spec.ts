import { BadRequestException } from '@nestjs/common';
import { AdjustmentNoteType } from './constants/adjustment-note-type.enum';
import {
  adjustmentTotals,
  evaluateAdjustment,
  formatNoteNumber,
  signedAdjustment,
} from './receipt-adjustments.util';

const credit = (amount: number | string) => ({
  note_type: AdjustmentNoteType.CREDIT_NOTE,
  adjustment_amount: amount,
});
const debit = (amount: number | string) => ({
  note_type: AdjustmentNoteType.DEBIT_NOTE,
  adjustment_amount: amount,
});

describe('receipt-adjustments.util (Historia 7)', () => {
  it('net liability = grand_total − credits + debits, in exact cents', () => {
    const totals = adjustmentTotals('119.00', [
      credit('0.10'),
      credit(0.2),
      debit('5.05'),
    ]);
    expect(totals).toEqual({
      grandTotal: 11900n,
      credited: 30n,
      debited: 505n,
      net: 12375n,
    });
  });

  it('signs the delta: negative for credit notes, positive for debit notes', () => {
    expect(signedAdjustment(credit('25.50'))).toBe(-25.5);
    expect(signedAdjustment(debit(3))).toBe(3);
  });

  it('accepts a credit note up to the grand_total and returns the resulting net', () => {
    expect(
      evaluateAdjustment('100.00', [], AdjustmentNoteType.CREDIT_NOTE, 100),
    ).toEqual({ amountCents: 10000n, netAfterCents: 0n });
    expect(
      evaluateAdjustment(
        '100.00',
        [credit(40)],
        AdjustmentNoteType.DEBIT_NOTE,
        '10.25',
      ),
    ).toEqual({ amountCents: 1025n, netAfterCents: 7025n });
  });

  it('rejects amounts that are not positive or exceed the grand_total', () => {
    for (const amount of [0, -1]) {
      expect(() =>
        evaluateAdjustment(
          '100.00',
          [],
          AdjustmentNoteType.CREDIT_NOTE,
          amount,
        ),
      ).toThrow('adjustmentAmount must be greater than 0');
    }
    expect(() =>
      evaluateAdjustment('100.00', [], AdjustmentNoteType.DEBIT_NOTE, 100.01),
    ).toThrow(
      'adjustmentAmount (100.01) cannot exceed the receipt grand_total (100.00)',
    );
  });

  it('caps cumulative credit notes at the grand_total', () => {
    const existing = [credit('60.00'), debit('30.00'), credit('30.00')];
    expect(() =>
      evaluateAdjustment(
        '100.00',
        existing,
        AdjustmentNoteType.CREDIT_NOTE,
        10.01,
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      evaluateAdjustment(
        '100.00',
        existing,
        AdjustmentNoteType.CREDIT_NOTE,
        10.01,
      ),
    ).toThrow('90.00 already credited, 10.00 available');
    // Justo hasta el tope sí; los débitos no amplían el crédito disponible.
    expect(
      evaluateAdjustment(
        '100.00',
        existing,
        AdjustmentNoteType.CREDIT_NOTE,
        10,
      ),
    ).toEqual({ amountCents: 1000n, netAfterCents: 3000n });
    // Las notas de débito no tienen tope acumulado (solo por nota).
    expect(
      evaluateAdjustment(
        '100.00',
        existing,
        AdjustmentNoteType.DEBIT_NOTE,
        100,
      ),
    ).toEqual({ amountCents: 10000n, netAfterCents: 14000n });
  });

  it('formats note numbers per type with 6 digits', () => {
    expect(formatNoteNumber(AdjustmentNoteType.CREDIT_NOTE, 1)).toBe(
      'CN-000001',
    );
    expect(formatNoteNumber(AdjustmentNoteType.DEBIT_NOTE, 1234567)).toBe(
      'DN-1234567',
    );
  });
});
