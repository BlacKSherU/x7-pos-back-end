import { BadRequestException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';
import {
  ReceiptCalculationItemInput,
  ReceiptCalculationResult,
  ReceiptCalculationTaxInput,
  ReceiptsCalculationService,
} from './receipts-calculation.service';
import { Receipt } from './entities/receipt.entity';
import { ReceiptItem } from '../receipt-item/entities/receipt-item.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { ReceiptTaxScope } from '../receipt-tax/constants/receipt-tax-scope.enum';

/** Helpers para construir entradas legibles. Los decimales llegan como string (pg). */
const item = (
  id: number,
  subtotal: string | number,
  discount: string | number = '0.00',
): ReceiptCalculationItemInput => ({
  id,
  subtotal,
  discount_amount: discount,
});

const itemTax = (
  id: number,
  receiptItemId: number | null,
  rate: string | number,
  amount: string | number = '0.00',
  name = 'IVA',
): ReceiptCalculationTaxInput => ({
  id,
  receipt_item_id: receiptItemId,
  name,
  rate,
  amount,
  scope: ReceiptTaxScope.ITEM,
});

const receiptTax = (
  id: number,
  rate: string | number,
  amount: string | number = '0.00',
  name = 'IVA',
): ReceiptCalculationTaxInput => ({
  id,
  receipt_item_id: null,
  name,
  rate,
  amount,
  scope: ReceiptTaxScope.RECEIPT,
});

/** Centavos enteros de un número con 2 decimales (para comprobar invariantes sin floats). */
const cents = (value: number): number => Math.round(value * 100);

/** Comprueba las invariantes contables de cualquier resultado. */
function expectBalanced(result: ReceiptCalculationResult): void {
  // grand_total = subtotal + total_tax − total_discount, exacto al centavo
  expect(cents(result.grand_total)).toBe(
    cents(result.subtotal) +
      cents(result.total_tax) -
      cents(result.total_discount),
  );
  // total_tax = Σ importes de los ReceiptTax
  expect(result.taxes.reduce((sum, tax) => sum + cents(tax.amount), 0)).toBe(
    cents(result.total_tax),
  );
  // Σ impuesto por línea + no asignado = total_tax
  expect(
    result.lines.reduce((sum, line) => sum + cents(line.tax), 0) +
      cents(result.unallocated_tax),
  ).toBe(cents(result.total_tax));
  // Todos los valores tienen como mucho 2 decimales y ningún impuesto es negativo
  const values = [
    result.subtotal,
    result.total_tax,
    result.total_discount,
    result.grand_total,
    ...result.taxes.map((tax) => tax.amount),
    ...result.lines.map((line) => line.tax),
  ];
  for (const value of values) {
    expect(cents(value) / 100).toBe(value);
  }
  for (const tax of result.taxes) expect(tax.amount).toBeGreaterThanOrEqual(0);
  for (const line of result.lines) expect(line.tax).toBeGreaterThanOrEqual(0);
}

/** PRNG determinista (mulberry32) para los casos aleatorios reproducibles. */
function prng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('ReceiptsCalculationService', () => {
  let service: ReceiptsCalculationService;

  const receiptRepo = { findOne: jest.fn(), update: jest.fn() };
  const itemRepo = { find: jest.fn() };
  const taxRepo = { find: jest.fn(), update: jest.fn() };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === Receipt) return receiptRepo;
      if (entity === ReceiptItem) return itemRepo;
      if (entity === ReceiptTax) return taxRepo;
      throw new Error('Unexpected repository');
    }),
  };
  const dataSource = {
    transaction: jest.fn((work: (m: EntityManager) => unknown) =>
      work(manager as unknown as EntityManager),
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReceiptsCalculationService(
      dataSource as unknown as DataSource,
    );
  });

  describe('calculate — totals', () => {
    it('returns zeros for a receipt without items or taxes', () => {
      const result = service.calculate({ items: [], taxes: [] });

      expect(result).toMatchObject({
        subtotal: 0,
        total_tax: 0,
        total_discount: 0,
        grand_total: 0,
        tax_exempt: false,
        exemption_code: null,
        rounding_adjustment: 0,
        unallocated_tax: 0,
        taxes: [],
        lines: [],
      });
    });

    it('sums decimal strings exactly (no floating point drift)', () => {
      // 0.1 + 0.2 en float es 0.30000000000000004
      const result = service.calculate({
        items: [item(1, '0.10'), item(2, '0.20')],
        taxes: [],
      });

      expect(result.subtotal).toBe(0.3);
      expect(result.grand_total).toBe(0.3);
    });

    it('stays exact to the cent with 1000 items of 0.10 and 0.01 discounts', () => {
      const items = Array.from({ length: 1000 }, (_, index) =>
        item(index + 1, '0.10', '0.01'),
      );

      const result = service.calculate({ items, taxes: [] });

      expect(result.subtotal).toBe(100);
      expect(result.total_discount).toBe(10);
      expect(result.grand_total).toBe(90);
      expectBalanced(result);
    });

    it('applies taxes on the discounted base and balances grand_total', () => {
      // base 25.00 − 2.50 = 22.50; 19% = 4.275 → 4.28 (half-up)
      const result = service.calculate({
        items: [item(1, '25.00', '2.50')],
        taxes: [itemTax(10, 1, '19.00', '4.00')],
      });

      expect(result.taxes[0]).toMatchObject({
        id: 10,
        mode: 'RATE',
        amount: 4.28,
        previous_amount: 4,
        changed: true,
      });
      expect(result).toMatchObject({
        subtotal: 25,
        total_discount: 2.5,
        total_tax: 4.28,
        grand_total: 26.78,
      });
      expect(result.lines[0]).toMatchObject({
        receipt_item_id: 1,
        taxable_base: 22.5,
        tax: 4.28,
      });
      expectBalanced(result);
    });

    it('marks a tax as unchanged when the stored amount is already correct', () => {
      const result = service.calculate({
        items: [item(1, '25.00', '2.50')],
        taxes: [itemTax(10, 1, '19.00', '4.28')],
      });

      expect(result.taxes[0].changed).toBe(false);
    });

    it('accepts numeric inputs and rounds them half-up from their decimal form', () => {
      // 1.005 en binario es 1.00499999…; el motor lo lee como "1.005" → 1.01
      const result = service.calculate({
        items: [item(1, 1.005), item(2, 0.1 + 0.2)],
        taxes: [],
      });

      expect(result.lines.map((line) => line.subtotal)).toEqual([1.01, 0.3]);
      expect(result.subtotal).toBe(1.31);
    });

    it('never taxes a negative base when the discount exceeds the subtotal', () => {
      const result = service.calculate({
        items: [item(1, '5.00', '6.00'), item(2, '10.00')],
        taxes: [itemTax(10, 1, '10.00'), receiptTax(11, '10.00')],
      });

      expect(result.lines[0].taxable_base).toBe(0);
      expect(result.taxes.find((tax) => tax.id === 10)?.amount).toBe(0);
      // el impuesto de recibo grava el subtotal del recibo (15.00 × 10% = 1.50, Historia 9)
      expect(result.taxes.find((tax) => tax.id === 11)?.amount).toBe(1.5);
      expect(result.grand_total).toBe(10.5); // 15.00 + 1.50 − 6.00
      expectBalanced(result);
    });

    it('orders items and taxes by id regardless of input order', () => {
      const result = service.calculate({
        items: [item(3, '1.00'), item(1, '1.00'), item(2, '1.00')],
        taxes: [receiptTax(9, '10.00'), receiptTax(4, '5.00', '0.00', 'B')],
      });

      expect(result.lines.map((line) => line.receipt_item_id)).toEqual([
        1, 2, 3,
      ]);
      expect(result.taxes.map((tax) => tax.id)).toEqual([4, 9]);
    });
  });

  describe('calculate — per-line rounding and last-line adjustment', () => {
    it('removes a rounding cent from the last line when Σ lines exceeds the global tax', () => {
      // 3 × 0.50 al 7%: por línea 0.035 → 0.04 (Σ 0.12); global 1.50 × 7% = 0.105 → 0.11
      const result = service.calculate({
        items: [item(1, '0.50'), item(2, '0.50'), item(3, '0.50')],
        taxes: [
          itemTax(10, 1, '7.00'),
          itemTax(11, 2, '7.00'),
          itemTax(12, 3, '7.00'),
        ],
      });

      expect(result.taxes.map((tax) => tax.amount)).toEqual([0.04, 0.04, 0.03]);
      expect(result.taxes.map((tax) => tax.rounding_adjustment)).toEqual([
        0, 0, -0.01,
      ]);
      expect(result.total_tax).toBe(0.11);
      expect(result.rounding_adjustment).toBe(-0.01);
      expect(result.grand_total).toBe(1.61);
      expectBalanced(result);
    });

    it('adds a rounding cent to the last line when Σ lines falls short of the global tax', () => {
      // 3 × 0.21 al 7%: por línea 0.0147 → 0.01 (Σ 0.03); global 0.63 × 7% = 0.0441 → 0.04
      const result = service.calculate({
        items: [item(1, '0.21'), item(2, '0.21'), item(3, '0.21')],
        taxes: [
          itemTax(10, 1, '7.00'),
          itemTax(11, 2, '7.00'),
          itemTax(12, 3, '7.00'),
        ],
      });

      expect(result.taxes.map((tax) => tax.amount)).toEqual([0.01, 0.01, 0.02]);
      expect(result.rounding_adjustment).toBe(0.01);
      expect(result.total_tax).toBe(0.04);
      expectBalanced(result);
    });

    it('treats the highest receipt_item_id as the final line, not the highest tax id', () => {
      const result = service.calculate({
        items: [item(1, '0.50'), item(2, '0.50'), item(3, '0.50')],
        taxes: [
          itemTax(30, 3, '7.00'),
          itemTax(31, 1, '7.00'),
          itemTax(32, 2, '7.00'),
        ],
      });

      const byItem = new Map(
        result.taxes.map((tax) => [tax.id, tax.amount] as const),
      );
      expect(byItem.get(30)).toBe(0.03); // ítem 3 = última línea
      expect(byItem.get(31)).toBe(0.04);
      expect(byItem.get(32)).toBe(0.04);
    });

    it('spills a large negative adjustment backwards without producing negative taxes (100 items)', () => {
      // 100 × 0.05 al 10%: por línea 0.005 → 0.01 (Σ 1.00); global 5.00 × 10% = 0.50
      const items = Array.from({ length: 100 }, (_, index) =>
        item(index + 1, '0.05'),
      );
      const taxes = items.map((line) =>
        itemTax(1000 + line.id, line.id, '10.00'),
      );

      const result = service.calculate({ items, taxes });

      expect(result.total_tax).toBe(0.5);
      expect(result.rounding_adjustment).toBe(-0.5);
      const amounts = result.taxes.map((tax) => tax.amount);
      expect(amounts.slice(0, 50).every((amount) => amount === 0.01)).toBe(
        true,
      );
      expect(amounts.slice(50).every((amount) => amount === 0)).toBe(true);
      expectBalanced(result);
    });

    it('groups item taxes by rate and name, adjusting each group independently', () => {
      const result = service.calculate({
        items: [item(1, '0.50'), item(2, '0.50'), item(3, '0.50')],
        taxes: [
          itemTax(10, 1, '7.00', '0', 'State'),
          itemTax(11, 2, '7.00', '0', 'State'),
          itemTax(12, 3, '7.00', '0', 'State'),
          itemTax(20, 1, '7.00', '0', 'City'),
          itemTax(21, 2, '7.00', '0', 'City'),
        ],
      });

      const amount = (id: number) =>
        result.taxes.find((tax) => tax.id === id)?.amount;
      // State: 3 líneas → 0.04, 0.04, 0.03 (global 0.11)
      expect([amount(10), amount(11), amount(12)]).toEqual([0.04, 0.04, 0.03]);
      // City: 2 líneas, 1.00 × 7% = 0.07 → 0.04 + 0.03
      expect([amount(20), amount(21)]).toEqual([0.04, 0.03]);
      expect(result.total_tax).toBe(0.18);
      expectBalanced(result);
    });

    it('computes a receipt-scope tax globally and allocates it per line with last-line adjustment', () => {
      const result = service.calculate({
        items: [item(1, '0.50'), item(2, '0.50'), item(3, '0.50')],
        taxes: [receiptTax(10, '7.00', '0.12')],
      });

      expect(result.taxes[0]).toMatchObject({
        mode: 'RATE',
        amount: 0.11,
        previous_amount: 0.12,
        changed: true,
      });
      expect(result.lines.map((line) => line.tax)).toEqual([0.04, 0.04, 0.03]);
      expect(result.rounding_adjustment).toBe(-0.01);
      expectBalanced(result);
    });

    it('combines item-scope and receipt-scope taxes on the same lines', () => {
      const result = service.calculate({
        items: [item(1, '10.00', '1.00'), item(2, '20.00')],
        taxes: [receiptTax(10, '16.00'), itemTax(11, 2, '2.50', '0', 'Local')],
      });

      // receipt: subtotal 30.00 × 16% = 4.80 (Historia 9); item 2: 20.00 × 2.5% = 0.50
      expect(result.total_tax).toBe(5.3);
      expect(result.lines.map((line) => line.tax)).toEqual([1.6, 3.7]);
      expect(result.grand_total).toBe(34.3); // 30.00 + 5.30 − 1.00
      expectBalanced(result);
    });

    it('rounds exact half cents up (half-up), e.g. 0.125 → 0.13', () => {
      // 1.25 × 10% = 0.125 → 0.13
      const result = service.calculate({
        items: [item(1, '1.25')],
        taxes: [receiptTax(10, '10.00')],
      });

      expect(result.total_tax).toBe(0.13);
    });

    it('treats an ITEM tax without receipt_item_id as a receipt-level tax', () => {
      const result = service.calculate({
        items: [item(1, '10.00'), item(2, '10.00')],
        taxes: [itemTax(10, null, '10.00')],
      });

      expect(result.taxes[0]).toMatchObject({ mode: 'RATE', amount: 2 });
    });
  });

  describe('calculate — fixed and orphan taxes', () => {
    it('keeps rate-0 taxes as fixed amounts (receipt-level → unallocated)', () => {
      const result = service.calculate({
        items: [item(1, '10.00')],
        taxes: [receiptTax(10, '0', '1.50', 'Bag fee')],
      });

      expect(result.taxes[0]).toMatchObject({
        mode: 'FIXED',
        amount: 1.5,
        changed: false,
      });
      expect(result.unallocated_tax).toBe(1.5);
      expect(result.grand_total).toBe(11.5);
      expectBalanced(result);
    });

    it('attributes an item-level fixed tax to its line', () => {
      const result = service.calculate({
        items: [item(1, '10.00'), item(2, '5.00')],
        taxes: [itemTax(10, 2, '0.00', '0.75', 'Deposit')],
      });

      expect(result.lines.map((line) => line.tax)).toEqual([0, 0.75]);
      expect(result.unallocated_tax).toBe(0);
      expectBalanced(result);
    });

    it('zeroes ITEM taxes whose item is no longer active (orphans)', () => {
      const result = service.calculate({
        items: [item(1, '10.00')],
        taxes: [itemTax(10, 99, '10.00', '3.00')],
      });

      expect(result.taxes[0]).toMatchObject({
        mode: 'ORPHAN',
        amount: 0,
        previous_amount: 3,
        changed: true,
      });
      expect(result.total_tax).toBe(0);
      expectBalanced(result);
    });
  });

  describe('calculate — tax exemption', () => {
    const items = [item(1, '25.00', '2.50'), item(2, '10.00')];
    const taxes = [
      itemTax(10, 1, '19.00', '4.28'),
      receiptTax(11, '5.00', '1.63'),
      receiptTax(12, '0', '0.00', 'Zero'),
    ];

    it('sets total_tax = 0 and every applied tax to 0.00 when exemption_code is present', () => {
      const result = service.calculate({
        items,
        taxes,
        fiscalData: '{"tax_id": "J-1", "exemption_code": "EX-2026-001"}',
      });

      expect(result.tax_exempt).toBe(true);
      expect(result.exemption_code).toBe('EX-2026-001');
      expect(result.total_tax).toBe(0);
      expect(result.grand_total).toBe(32.5);
      expect(result.taxes).toEqual([
        expect.objectContaining({
          id: 10,
          mode: 'EXEMPT',
          amount: 0,
          changed: true,
        }),
        expect.objectContaining({
          id: 11,
          mode: 'EXEMPT',
          amount: 0,
          changed: true,
        }),
        expect.objectContaining({
          id: 12,
          mode: 'EXEMPT',
          amount: 0,
          changed: false,
        }),
      ]);
      expect(result.lines.every((line) => line.tax === 0)).toBe(true);
      expect(result.rounding_adjustment).toBe(0);
      expectBalanced(result);
    });

    it('honours tax_exempt: true', () => {
      const result = service.calculate({
        items,
        taxes,
        fiscalData: '{"tax_exempt": true, "exemption_code": "EX-9"}',
      });

      expect(result.tax_exempt).toBe(true);
      expect(result.total_tax).toBe(0);
    });

    it('bypasses ReceiptTax calculations entirely (invalid rates are not even evaluated)', () => {
      const result = service.calculate({
        items,
        taxes: [itemTax(10, 1, 'not-a-rate', '1.00')],
        fiscalData: '{"exemption_code": "EX-1"}',
      });

      expect(result.taxes[0]).toMatchObject({ mode: 'EXEMPT', amount: 0 });
    });

    it('does not exempt when tax_exempt is explicitly false (suspended exemption)', () => {
      const result = service.calculate({
        items,
        taxes,
        fiscalData: '{"tax_exempt": false, "exemption_code": "EX-1"}',
      });

      expect(result.tax_exempt).toBe(false);
      expect(result.exemption_code).toBe('EX-1');
      expect(result.total_tax).toBeGreaterThan(0);
    });

    it.each([
      ['null fiscal data', null],
      ['malformed JSON', '{not json'],
      ['JSON array', '["EX-1"]'],
      ['blank exemption_code', '{"exemption_code": "  "}'],
      ['only tax_id', '{"tax_id": "123"}'],
      ['POS fiscal data', '{"taxId": [1, 2], "businessName": "Shop"}'],
    ])('is not exempt with %s', (_label, fiscalData) => {
      const result = service.calculate({ items, taxes, fiscalData });

      expect(result.tax_exempt).toBe(false);
      // ítem: 22.50 × 19% = 4.275 → 4.28; recibo: subtotal 35.00 × 5% = 1.75
      expect(result.total_tax).toBe(6.03);
      expectBalanced(result);
    });
  });

  describe('calculate — decimal(12,2) limits', () => {
    it('accepts values exactly at the column limit', () => {
      const result = service.calculate({
        items: [item(1, '9999999999.99', '9999999999.99')],
        taxes: [],
      });

      expect(result.subtotal).toBe(9999999999.99);
      expect(result.total_discount).toBe(9999999999.99);
      expect(result.grand_total).toBe(0);
    });

    it('rejects a subtotal that would overflow decimal(12,2) with a controlled 400', () => {
      expect(() =>
        service.calculate({
          items: [item(1, '9999999999.99'), item(2, '0.01')],
          taxes: [],
        }),
      ).toThrow(
        new BadRequestException(
          'Receipt subtotal (10000000000.00) exceeds the supported range of ±9999999999.99 (decimal 12,2)',
        ),
      );
    });

    it('rejects a tax amount that would overflow decimal(12,2)', () => {
      expect(() =>
        service.calculate({
          items: [item(1, '9000000000.00')],
          taxes: [receiptTax(10, '200.00')],
        }),
      ).toThrow(/Receipt tax 10 amount .* exceeds the supported range/);
    });

    it('rejects a grand_total that would overflow even if each part fits', () => {
      expect(() =>
        service.calculate({
          items: [item(1, '9000000000.00')],
          taxes: [receiptTax(10, '20.00')],
        }),
      ).toThrow(/Receipt grand_total .* exceeds the supported range/);
    });

    it('rejects an item value out of range before computing', () => {
      expect(() =>
        service.calculate({ items: [item(1, '10000000000.00')], taxes: [] }),
      ).toThrow(/Receipt item 1 subtotal/);
    });

    it.each([
      ['negative', '-1.00'],
      ['above 999.99', '1000.00'],
    ])('rejects a %s tax rate', (_label, rate) => {
      expect(() =>
        service.calculate({
          items: [item(1, '10.00')],
          taxes: [receiptTax(10, rate)],
        }),
      ).toThrow(/Receipt tax 10 rate .* must be between 0 and 999.99/);
    });

    it('rejects non-numeric values with a 400 instead of persisting NaN', () => {
      expect(() =>
        service.calculate({ items: [item(1, 'abc')], taxes: [] }),
      ).toThrow(BadRequestException);
    });

    it('keeps sub-cent inputs within scale 2 (half-up)', () => {
      const result = service.calculate({
        items: [item(1, '10.004'), item(2, '10.005')],
        taxes: [],
      });

      expect(result.lines.map((line) => line.subtotal)).toEqual([10, 10.01]);
    });

    it('handles the maximum rate on a large base without precision loss', () => {
      // 1 000 000.00 × 999.99% = 9 999 900.00
      const result = service.calculate({
        items: [item(1, '1000000.00')],
        taxes: [receiptTax(10, '999.99')],
      });

      expect(result.total_tax).toBe(9999900);
      expect(result.grand_total).toBe(10999900);
    });
  });

  describe('calculate — randomized invariants', () => {
    it('always balances to the cent across 300 random receipts', () => {
      const random = prng(20261122);
      const rates = [
        '7.00',
        '8.25',
        '10.00',
        '16.00',
        '19.00',
        '0.00',
        '12.50',
      ];
      const names = ['IVA', 'State', 'City'];

      for (let run = 0; run < 300; run += 1) {
        const itemCount = 1 + Math.floor(random() * 40);
        const items = Array.from({ length: itemCount }, (_, index) => {
          const subtotalCents = Math.floor(random() * 500_00);
          const discountCents = Math.floor(random() * subtotalCents * 0.3);
          return item(
            index + 1,
            (subtotalCents / 100).toFixed(2),
            (discountCents / 100).toFixed(2),
          );
        });
        const taxes: ReceiptCalculationTaxInput[] = [];
        let taxId = 1;
        for (const line of items) {
          if (random() < 0.7) {
            taxes.push(
              itemTax(
                taxId++,
                line.id,
                rates[Math.floor(random() * rates.length)],
                (Math.floor(random() * 300) / 100).toFixed(2),
                names[Math.floor(random() * names.length)],
              ),
            );
          }
        }
        if (random() < 0.5) taxes.push(receiptTax(taxId++, '8.25'));

        const result = service.calculate({ items, taxes });

        expectBalanced(result);
        // El total de cada grupo ITEM coincide con round(Σ bases × tasa)
        const groups = new Map<
          string,
          { base: number; tax: number; rate: number }
        >();
        for (const tax of taxes) {
          if (tax.scope !== ReceiptTaxScope.ITEM || tax.rate === '0.00')
            continue;
          const line = result.lines.find(
            (l) => l.receipt_item_id === tax.receipt_item_id,
          );
          const key = `${String(tax.rate)}|${tax.name}`;
          const group = groups.get(key) ?? {
            base: 0,
            tax: 0,
            rate: Number(tax.rate) * 100,
          };
          group.base += cents(line?.taxable_base ?? 0);
          group.tax += cents(
            result.taxes.find((t) => t.id === tax.id)?.amount ?? 0,
          );
          groups.set(key, group);
        }
        for (const group of groups.values()) {
          const exact =
            (BigInt(group.base) * BigInt(group.rate) * 2n + 10_000n) / 20_000n;
          expect(BigInt(group.tax)).toBe(exact);
        }
      }
    });
  });

  describe('recalculate (persistence)', () => {
    const receipt = { id: 5, fiscal_data: null as string | null };

    beforeEach(() => {
      receiptRepo.findOne.mockResolvedValue(receipt);
      receiptRepo.update.mockResolvedValue(undefined);
      taxRepo.update.mockResolvedValue(undefined);
      itemRepo.find.mockResolvedValue([
        { id: 1, subtotal: '0.50', discount_amount: '0.00' },
        { id: 2, subtotal: '0.50', discount_amount: '0.00' },
        { id: 3, subtotal: '0.50', discount_amount: '0.00' },
      ]);
      taxRepo.find.mockResolvedValue([
        {
          id: 10,
          receipt_item_id: 1,
          name: 'IVA',
          rate: '7.00',
          amount: '0.04',
          scope: ReceiptTaxScope.ITEM,
        },
        {
          id: 11,
          receipt_item_id: 2,
          name: 'IVA',
          rate: '7.00',
          amount: '0.04',
          scope: ReceiptTaxScope.ITEM,
        },
        {
          id: 12,
          receipt_item_id: 3,
          name: 'IVA',
          rate: '7.00',
          amount: '0.04',
          scope: ReceiptTaxScope.ITEM,
        },
      ]);
    });

    it('loads active rows inside a transaction, locking the receipt', async () => {
      await service.recalculate(5);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(receiptRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(itemRepo.find).toHaveBeenCalledWith({
        where: { receipt_id: 5, is_active: true },
        order: { id: 'ASC' },
      });
      expect(taxRepo.find).toHaveBeenCalledWith({
        where: { receipt_id: 5, is_active: true },
        order: { id: 'ASC' },
      });
    });

    it('persists balanced totals and only the tax rows whose amount changed', async () => {
      const result = await service.recalculate(5);

      // sólo la última línea cambia (0.04 → 0.03)
      expect(taxRepo.update).toHaveBeenCalledTimes(1);
      expect(taxRepo.update).toHaveBeenCalledWith(12, { amount: 0.03 });
      expect(receiptRepo.update).toHaveBeenCalledWith(5, {
        subtotal: 1.5,
        total_tax: 0.11,
        total_discount: 0,
        grand_total: 1.61,
      });
      expect(result?.total_tax).toBe(0.11);
    });

    it('never overwrites fiscal_data', async () => {
      receiptRepo.findOne.mockResolvedValue({
        ...receipt,
        fiscal_data: '{"exemption_code": "EX-1"}',
      });

      await service.recalculate(5);

      const payload = receiptRepo.update.mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(payload).not.toHaveProperty('fiscal_data');
    });

    it('sets every active tax to 0.00 and total_tax to 0 for an exempt receipt', async () => {
      receiptRepo.findOne.mockResolvedValue({
        ...receipt,
        fiscal_data: '{"tax_id": "J-1", "exemption_code": "EX-2026-001"}',
      });

      const result = await service.recalculate(5);

      expect(taxRepo.update).toHaveBeenCalledTimes(3);
      for (const id of [10, 11, 12]) {
        expect(taxRepo.update).toHaveBeenCalledWith(id, { amount: 0 });
      }
      expect(receiptRepo.update).toHaveBeenCalledWith(5, {
        subtotal: 1.5,
        total_tax: 0,
        total_discount: 0,
        grand_total: 1.5,
      });
      expect(result).toMatchObject({
        tax_exempt: true,
        exemption_code: 'EX-2026-001',
      });
    });

    it('returns null and writes nothing when the receipt does not exist', async () => {
      receiptRepo.findOne.mockResolvedValue(null);

      await expect(service.recalculate(404)).resolves.toBeNull();
      expect(itemRepo.find).not.toHaveBeenCalled();
      expect(receiptRepo.update).not.toHaveBeenCalled();
      expect(taxRepo.update).not.toHaveBeenCalled();
    });

    it('aborts without writing when totals would overflow decimal(12,2)', async () => {
      itemRepo.find.mockResolvedValue([
        { id: 1, subtotal: '9999999999.99', discount_amount: '0.00' },
        { id: 2, subtotal: '1.00', discount_amount: '0.00' },
      ]);
      taxRepo.find.mockResolvedValue([]);

      await expect(service.recalculate(5)).rejects.toThrow(BadRequestException);
      expect(receiptRepo.update).not.toHaveBeenCalled();
      expect(taxRepo.update).not.toHaveBeenCalled();
    });
  });
});
