import { BadRequestException } from '@nestjs/common';
import {
  MAX_MONEY_CENTS,
  assertMoneyInRange,
  assertRateInRange,
  centsToNumber,
  divRoundHalfUp,
  formatScaled,
  isMoneyInRange,
  sumCents,
  taxOnBase,
  toCents,
  toRateHundredths,
  toScaledInt,
} from './receipt-money.util';

describe('receipt-money.util', () => {
  describe('toCents', () => {
    it.each([
      ['12.5', 1250n],
      ['12.50', 1250n],
      ['12.344', 1234n],
      ['12.345', 1235n],
      ['12.3449999', 1234n],
      ['-12.345', -1235n],
      ['-0.004', 0n],
      ['0.005', 1n],
      ['.5', 50n],
      ['5.', 500n],
      ['+3', 300n],
      ['  7.10  ', 710n],
      ['9999999999.99', 999_999_999_999n],
      ['0', 0n],
      ['', 0n],
    ])('parses the string %p as %p cents', (input, expected) => {
      expect(toCents(input)).toBe(expected);
    });

    it.each([
      [1.005, 101n],
      [0.1 + 0.2, 30n],
      [2.675, 268n],
      [-1.005, -101n],
      [1e-7, 0n],
      [123, 12300n],
      [1e21, 10n ** 23n],
    ])('parses the number %p as %p cents', (input, expected) => {
      expect(toCents(input)).toBe(expected);
    });

    it('treats null and undefined as zero', () => {
      expect(toCents(null)).toBe(0n);
      expect(toCents(undefined)).toBe(0n);
    });

    it.each(['abc', '1e5', '.', '-', '1.2.3', '12,50'])(
      'rejects the invalid string %p',
      (input) => {
        expect(() => toCents(input)).toThrow(BadRequestException);
      },
    );

    it.each([NaN, Infinity, -Infinity])('rejects the number %p', (input) => {
      expect(() => toCents(input)).toThrow(BadRequestException);
    });
  });

  describe('toScaledInt / toRateHundredths', () => {
    it('supports other scales', () => {
      expect(toScaledInt('1.2345', 3)).toBe(1235n);
      expect(toScaledInt('7.5', 0)).toBe(8n);
    });

    it('reads a decimal(5,2) rate as hundredths', () => {
      expect(toRateHundredths('19.00')).toBe(1900n);
      expect(toRateHundredths(8.25)).toBe(825n);
      expect(toRateHundredths('999.99')).toBe(99_999n);
    });
  });

  describe('formatScaled / centsToNumber', () => {
    it.each([
      [0n, '0.00'],
      [5n, '0.05'],
      [-5n, '-0.05'],
      [123_456n, '1234.56'],
      [MAX_MONEY_CENTS, '9999999999.99'],
    ])('formats %p as %p', (input, expected) => {
      expect(formatScaled(input)).toBe(expected);
    });

    it('converts cents to an exact 2-decimal number', () => {
      expect(centsToNumber(MAX_MONEY_CENTS)).toBe(9999999999.99);
      expect(centsToNumber(-MAX_MONEY_CENTS)).toBe(-9999999999.99);
      expect(centsToNumber(30n)).toBe(0.3);
      expect(Object.is(centsToNumber(-0n), 0)).toBe(true);
    });

    it('round-trips every cent value through number without loss (sampled)', () => {
      for (let value = MAX_MONEY_CENTS; value > 0n; value /= 7n) {
        expect(toCents(centsToNumber(value))).toBe(value);
      }
    });
  });

  describe('divRoundHalfUp', () => {
    it.each([
      [5n, 2n, 3n],
      [-5n, 2n, -3n],
      [5n, -2n, -3n],
      [4n, 3n, 1n],
      [5n, 3n, 2n],
      [-4n, 3n, -1n],
      [-5n, 3n, -2n],
      [0n, 7n, 0n],
    ])('%p / %p = %p', (numerator, denominator, expected) => {
      expect(divRoundHalfUp(numerator, denominator)).toBe(expected);
    });

    it('throws on division by zero', () => {
      expect(() => divRoundHalfUp(1n, 0n)).toThrow(RangeError);
    });
  });

  describe('taxOnBase', () => {
    it('computes base × rate rounded half-up to the cent', () => {
      expect(taxOnBase(2250n, 1900n)).toBe(428n); // 22.50 × 19% = 4.275
      expect(taxOnBase(150n, 700n)).toBe(11n); // 1.50 × 7% = 0.105
      expect(taxOnBase(5n, 1000n)).toBe(1n); // 0.05 × 10% = 0.005
      expect(taxOnBase(4n, 1000n)).toBe(0n); // 0.04 × 10% = 0.004
      expect(taxOnBase(0n, 1900n)).toBe(0n);
    });

    it('does not lose precision on the largest base and rate', () => {
      // 9 999 999 999.99 × 999.99% excede el rango pero el cálculo en bigint es exacto
      expect(taxOnBase(MAX_MONEY_CENTS, 99_999n)).toBe(9_999_899_999_990n);
    });
  });

  describe('range guards', () => {
    it('accepts the decimal(12,2) boundaries and rejects one cent beyond', () => {
      expect(isMoneyInRange(MAX_MONEY_CENTS)).toBe(true);
      expect(isMoneyInRange(-MAX_MONEY_CENTS)).toBe(true);
      expect(isMoneyInRange(MAX_MONEY_CENTS + 1n)).toBe(false);
      expect(() => assertMoneyInRange(MAX_MONEY_CENTS, 'x')).not.toThrow();
      expect(() => assertMoneyInRange(MAX_MONEY_CENTS + 1n, 'Total')).toThrow(
        new BadRequestException(
          'Total (10000000000.00) exceeds the supported range of ±9999999999.99 (decimal 12,2)',
        ),
      );
    });

    it('accepts rates in [0, 999.99]', () => {
      expect(() => assertRateInRange(0n, 'rate')).not.toThrow();
      expect(() => assertRateInRange(99_999n, 'rate')).not.toThrow();
      expect(() => assertRateInRange(100_000n, 'rate')).toThrow(
        BadRequestException,
      );
      expect(() => assertRateInRange(-1n, 'rate')).toThrow(BadRequestException);
    });
  });

  it('sumCents adds bigint values', () => {
    expect(sumCents([])).toBe(0n);
    expect(sumCents([1n, 2n, -3n, 10n])).toBe(10n);
  });
});
