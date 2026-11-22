import { BadRequestException } from '@nestjs/common';
import {
  assertValidTaxRate,
  calculateTaxAmount,
  hasAtMostTwoDecimals,
  RECEIPT_TAX_RATE_MAX,
  toCents,
} from './receipt-tax-calculation';

describe('receipt-tax-calculation', () => {
  describe('calculateTaxAmount', () => {
    it('applies the rate over the base and rounds half-up to the cent', () => {
      expect(calculateTaxAmount(25, 19)).toBe(4.75);
      expect(calculateTaxAmount(10.05, 7.5)).toBe(0.75); // 0.75375 → 0.75
      expect(calculateTaxAmount(0.1, 5)).toBe(0.01); // 0.005 → 0.01 (half-up)
      expect(calculateTaxAmount(33.33, 16)).toBe(5.33); // 5.3328
    });

    it('accepts numeric strings as returned by Postgres decimals', () => {
      expect(calculateTaxAmount('1234.56', 21)).toBe(259.26); // 259.2576
    });

    it('does not suffer from binary floating point errors', () => {
      // 1.15 * 10 / 100 = 0.115 → float math gives 0.11499999...; cents math gives 0.12
      expect(calculateTaxAmount(1.15, 10)).toBe(0.12);
    });

    it('treats a negative base as zero', () => {
      expect(calculateTaxAmount(-50, 19)).toBe(0);
    });

    it('supports the largest values of the columns without precision loss', () => {
      // 999,999,999.99 × 999.99% = 9,999,899,999.90 (fits decimal(12,2))
      expect(calculateTaxAmount(999_999_999.99, 999.99)).toBe(9_999_899_999.9);
    });

    it('rejects results that overflow decimal(12,2) with a clear message', () => {
      expect(() => calculateTaxAmount(9_999_999_999.99, 999.99)).toThrow(
        /exceeds the maximum of 9999999999\.99 .*decimal\(12,2\)/,
      );
    });

    it('validates the rate before calculating', () => {
      expect(() => calculateTaxAmount(100, 19.555)).toThrow(BadRequestException);
    });
  });

  describe('assertValidTaxRate', () => {
    it('accepts rates within decimal(5,2)', () => {
      expect(() => assertValidTaxRate(0)).not.toThrow();
      expect(() => assertValidTaxRate(19.99)).not.toThrow();
      expect(() => assertValidTaxRate(RECEIPT_TAX_RATE_MAX)).not.toThrow();
    });

    it('rejects negative rates', () => {
      expect(() => assertValidTaxRate(-1)).toThrow('rate cannot be negative');
    });

    it('rejects rates above 999.99', () => {
      expect(() => assertValidTaxRate(1000)).toThrow(
        'rate cannot exceed 999.99 (column precision decimal(5,2))',
      );
    });

    it('rejects rates with more than 2 decimals', () => {
      expect(() => assertValidTaxRate(19.123)).toThrow(
        'rate must have at most 2 decimal places (column precision decimal(5,2))',
      );
    });

    it('rejects non numeric rates', () => {
      expect(() => assertValidTaxRate(Number.NaN)).toThrow(
        'rate must be a valid number',
      );
    });
  });

  describe('helpers', () => {
    it('hasAtMostTwoDecimals tolerates float noise', () => {
      expect(hasAtMostTwoDecimals(19.99)).toBe(true);
      expect(hasAtMostTwoDecimals(0.07)).toBe(true);
      expect(hasAtMostTwoDecimals(0.001)).toBe(false);
    });

    it('toCents converts numbers and strings to integer cents', () => {
      expect(toCents('12.34')).toBe(1234);
      expect(toCents(0.1 + 0.2)).toBe(30);
      expect(toCents(null)).toBe(0);
    });
  });
});
