import { BadRequestException } from '@nestjs/common';
import {
  parseFiscalData,
  resolveTaxExemption,
  validateFiscalDataPayload,
} from './receipt-fiscal-data.util';

describe('receipt-fiscal-data.util', () => {
  describe('parseFiscalData (lenient)', () => {
    it('returns the parsed object', () => {
      expect(parseFiscalData('{"tax_id": "1", "extra": 2}')).toEqual({
        tax_id: '1',
        extra: 2,
      });
    });

    it.each([
      null,
      undefined,
      '',
      '   ',
      '{bad',
      '[1]',
      '"text"',
      '42',
      'null',
    ])('returns null for %p without throwing', (raw) => {
      expect(parseFiscalData(raw)).toBeNull();
    });
  });

  describe('resolveTaxExemption (rule)', () => {
    it.each([
      ['exemption_code present', '{"exemption_code": "EX-1"}', true, 'EX-1'],
      ['exemption_code trimmed', '{"exemption_code": "  EX-1 "}', true, 'EX-1'],
      [
        'tax_exempt true + code',
        '{"tax_exempt": true, "exemption_code": "EX-2"}',
        true,
        'EX-2',
      ],
      [
        'tax_exempt true without code (legacy)',
        '{"tax_exempt": true}',
        true,
        null,
      ],
      [
        'tax_exempt false wins over code',
        '{"tax_exempt": false, "exemption_code": "EX-3"}',
        false,
        'EX-3',
      ],
      ['empty exemption_code', '{"exemption_code": ""}', false, null],
      ['non-string exemption_code', '{"exemption_code": 123}', false, null],
      [
        'non-boolean tax_exempt falls back to code',
        '{"tax_exempt": "true"}',
        false,
        null,
      ],
      ['only tax_id', '{"tax_id": "J-1"}', false, null],
      ['invalid JSON', 'not json', false, null],
      ['null', null, false, null],
    ])('%s → exempt=%p', (_label, raw, exempt, code) => {
      const result = resolveTaxExemption(raw);
      expect(result.exempt).toBe(exempt);
      expect(result.exemptionCode).toBe(code);
    });

    it('exposes the tax_id when it is a string', () => {
      expect(
        resolveTaxExemption('{"tax_id": " J-1 ", "exemption_code": "EX"}'),
      ).toEqual({ exempt: true, exemptionCode: 'EX', taxId: 'J-1' });
    });
  });

  describe('validateFiscalDataPayload (strict)', () => {
    it.each([
      '{"tax_id": "J-12345678-9", "exemption_code": "EX-2026-001"}',
      '{"tax_id": "J-1"}',
      '{"exemption_code": "EX-1", "tax_exempt": true}',
      '{"exemption_code": "EX-1", "tax_exempt": false}',
      '{"tax_exempt": false}',
      '{"tax_id": null, "exemption_code": null, "tax_exempt": null}',
      '{"fiscal_number": "ABC123", "custom": {"nested": true}}',
      '{}',
    ])('accepts %s', (raw) => {
      expect(() => validateFiscalDataPayload(raw)).not.toThrow();
    });

    it('returns the parsed payload preserving unknown keys', () => {
      expect(
        validateFiscalDataPayload('{"exemption_code": "EX", "extra": 1}'),
      ).toEqual({ exemption_code: 'EX', extra: 1 });
    });

    it.each([
      ['not json', 'fiscalData must be valid JSON'],
      ['[1, 2]', 'fiscalData must be a valid JSON object'],
      ['"text"', 'fiscalData must be a valid JSON object'],
      ['null', 'fiscalData must be a valid JSON object'],
      [
        '{"tax_id": ""}',
        'fiscalData.tax_id must be a non-empty string of at most 64 characters',
      ],
      [
        '{"tax_id": 123}',
        'fiscalData.tax_id must be a non-empty string of at most 64 characters',
      ],
      [
        `{"tax_id": "${'1'.repeat(65)}"}`,
        'fiscalData.tax_id must be a non-empty string of at most 64 characters',
      ],
      [
        '{"exemption_code": "   "}',
        'fiscalData.exemption_code must be a non-empty string of at most 64 characters',
      ],
      [
        '{"exemption_code": ["EX"]}',
        'fiscalData.exemption_code must be a non-empty string of at most 64 characters',
      ],
      ['{"tax_exempt": "yes"}', 'fiscalData.tax_exempt must be a boolean'],
      ['{"tax_exempt": 1}', 'fiscalData.tax_exempt must be a boolean'],
      [
        '{"tax_exempt": true}',
        'fiscalData.exemption_code is required when tax_exempt is true',
      ],
    ])('rejects %s', (raw, message) => {
      expect(() => validateFiscalDataPayload(raw)).toThrow(
        new BadRequestException(message),
      );
    });

    it('accepts codes of exactly 64 characters', () => {
      const code = 'E'.repeat(64);
      expect(() =>
        validateFiscalDataPayload(`{"exemption_code": "${code}"}`),
      ).not.toThrow();
    });
  });
});
