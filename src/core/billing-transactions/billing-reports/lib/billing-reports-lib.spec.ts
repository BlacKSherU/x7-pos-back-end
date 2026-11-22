import { BadRequestException } from '@nestjs/common';

import { buildCsv, csvCell, csvFileName, csvRow } from './csv.util';
import {
  escapeLike,
  fromCents,
  percentOf,
  resolveDateRange,
  toCents,
} from './report-utils';
import { summarizeOrderSnapshot } from './order-snapshot.util';

describe('csv.util', () => {
  it('quotes fields with commas, quotes and line breaks and doubles inner quotes', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
    expect(csvCell('cr\rlf')).toBe('"cr\rlf"');
  });

  it('renders empty values, numbers, booleans and dates', () => {
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(12.5)).toBe('12.5');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(Number.NaN)).toBe('');
    expect(csvCell(true)).toBe('true');
    expect(csvCell(new Date('2026-01-01T00:00:00Z'))).toBe(
      '2026-01-01T00:00:00.000Z',
    );
  });

  it('neutralises spreadsheet formulas but keeps plain negative amounts', () => {
    expect(csvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(csvCell('+cmd')).toBe("'+cmd");
    expect(csvCell('@user')).toBe("'@user");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('-5.00')).toBe('-5.00');
    expect(csvCell('=1,2')).toBe(`"'=1,2"`);
  });

  it('builds a document with BOM, header and CRLF line endings', () => {
    expect(csvRow(['a', 1, null])).toBe('a,1,');
    const csv = buildCsv(['Name', 'Amount'], [['VAT', '19.00']]);
    expect(csv).toBe('\uFEFFName,Amount\r\nVAT,19.00\r\n');
  });

  it('builds safe file names', () => {
    expect(csvFileName('tax-liability', ['2026-01-01', '2026-01-31'])).toBe(
      'tax-liability_2026-01-01_2026-01-31.csv',
    );
    expect(csvFileName('discount-audit', [undefined, ' ', 'a"b/c'])).toBe(
      'discount-audit_a-b-c.csv',
    );
  });
});

describe('report-utils', () => {
  it('adds money in whole cents', () => {
    expect(toCents('0.10') + toCents('0.20')).toBe(30);
    expect(fromCents(toCents('0.10') + toCents('0.20'))).toBe(0.3);
    expect(toCents('1234567.89')).toBe(123456789);
    expect(toCents(null)).toBe(0);
    expect(toCents('abc')).toBe(0);
  });

  it('computes percentages with two decimals', () => {
    expect(percentOf(250, 2500)).toBe(10);
    expect(percentOf(1, 3)).toBe(33.33);
    expect(percentOf(5, 0)).toBeNull();
  });

  it('makes a date-only upper bound cover the whole day', () => {
    expect(resolveDateRange('2026-01-01', '2026-01-31')).toEqual({
      from: '2026-01-01',
      to: '2026-02-01',
      toExclusive: true,
    });
    expect(resolveDateRange(undefined, '2026-12-31')).toEqual({
      from: undefined,
      to: '2027-01-01',
      toExclusive: true,
    });
    expect(resolveDateRange(undefined, '2026-01-31T10:00:00Z')).toEqual({
      from: undefined,
      to: '2026-01-31T10:00:00Z',
      toExclusive: false,
    });
    expect(() => resolveDateRange('2026-02-01', '2026-01-01')).toThrow(
      BadRequestException,
    );
  });

  it('escapes LIKE wildcards', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
  });
});

describe('summarizeOrderSnapshot', () => {
  it('returns null when there is no snapshot', () => {
    expect(summarizeOrderSnapshot(null)).toBeNull();
    expect(summarizeOrderSnapshot('not json')).toBeNull();
    expect(summarizeOrderSnapshot([1, 2])).toBeNull();
  });

  it('accepts a JSON string and snake_case keys', () => {
    const summary = summarizeOrderSnapshot(
      JSON.stringify({
        order_id: '15',
        order_number: 'A-15',
        discount_total: '1.5',
        items: [{ name: 'Tea', qty: 3 }],
      }),
    );
    expect(summary).toEqual({
      order_id: 15,
      order_number: 'A-15',
      item_count: 1,
      items_summary: '3 x Tea',
      payment_methods: '',
      subtotal: null,
      discount_total: 1.5,
      total: null,
    });
  });

  it('caps the item list at 10 entries', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      productName: `P${i + 1}`,
      quantity: 1,
    }));
    const summary = summarizeOrderSnapshot({ items });
    expect(summary?.item_count).toBe(12);
    expect(summary?.items_summary.endsWith('1 x P10; +2 more')).toBe(true);
  });
});
