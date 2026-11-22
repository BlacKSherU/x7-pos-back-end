import { BadRequestException } from '@nestjs/common';

/**
 * Tax amount calculation for receipt_taxes.
 *
 * Money is handled in integer cents and the rate in basis points (19.5% → 1950) so the
 * result never depends on binary floating point. The product goes through BigInt because
 * the largest base (decimal(12,2) → 999,999,999,999 cents) times the largest rate
 * (decimal(5,2) → 99,999 bp) exceeds Number.MAX_SAFE_INTEGER.
 */

/** `rate` column is decimal(5,2): 3 integer digits and 2 decimals. */
export const RECEIPT_TAX_RATE_MAX = 999.99;

/** `amount` column is decimal(12,2): 10 integer digits and 2 decimals. */
export const RECEIPT_TAX_AMOUNT_MAX = 9_999_999_999.99;

const AMOUNT_MAX_CENTS = 999_999_999_999n;

/** True when `value` has at most 2 decimal places (tolerates float noise like 19.99*100). */
export function hasAtMostTwoDecimals(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6;
}

/** Validates a tax rate against the precision of the `rate` column (decimal(5,2)). */
export function assertValidTaxRate(rate: number): void {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    throw new BadRequestException('rate must be a valid number');
  }
  if (rate < 0) {
    throw new BadRequestException('rate cannot be negative');
  }
  if (rate > RECEIPT_TAX_RATE_MAX) {
    throw new BadRequestException(
      `rate cannot exceed ${RECEIPT_TAX_RATE_MAX} (column precision decimal(5,2))`,
    );
  }
  if (!hasAtMostTwoDecimals(rate)) {
    throw new BadRequestException(
      'rate must have at most 2 decimal places (column precision decimal(5,2))',
    );
  }
}

/** Converts a money value (number or numeric string from Postgres) to integer cents. */
export function toCents(value: number | string | null | undefined): number {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/**
 * Tax amount = taxable base × rate / 100, rounded half-up to the cent.
 * A negative base is treated as 0 (there is no negative tax on a receipt line).
 * Throws BadRequestException when the result does not fit decimal(12,2).
 */
export function calculateTaxAmount(
  taxableBase: number | string,
  rate: number,
): number {
  assertValidTaxRate(rate);
  const baseCents = BigInt(Math.max(0, toCents(taxableBase)));
  const rateBasisPoints = BigInt(Math.round(rate * 100));
  const amountCents = (baseCents * rateBasisPoints + 5_000n) / 10_000n;

  if (amountCents > AMOUNT_MAX_CENTS) {
    throw new BadRequestException(
      `Calculated tax amount ${(Number(amountCents) / 100).toFixed(2)} exceeds the maximum of ${RECEIPT_TAX_AMOUNT_MAX.toFixed(2)} allowed by the amount column (decimal(12,2))`,
    );
  }

  return Number(amountCents) / 100;
}
