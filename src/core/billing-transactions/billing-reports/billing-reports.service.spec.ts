/* eslint-disable @typescript-eslint/unbound-method */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { In } from 'typeorm';

import { BillingReportsService, TaxLiabilityRawRow } from './billing-reports.service';
import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { ReceiptTaxScope } from '../receipt-tax/constants/receipt-tax-scope.enum';
import { ReceiptType } from '../receipts/constants/receipt-type.enum';
import { User } from 'src/platform-saas/users/entities/user.entity';
import { DiscountAuditEventType } from './dto/billing-report-query.dto';
import { DiscountAuditEvent } from './dto/discount-audit-report.dto';

type QbMock = Record<string, jest.Mock>;

const CHAIN_METHODS = [
  'innerJoin',
  'leftJoin',
  'select',
  'addSelect',
  'where',
  'andWhere',
  'orderBy',
  'addOrderBy',
  'groupBy',
  'skip',
  'take',
];

function createQb(result: {
  raw?: unknown[];
  many?: unknown[];
  count?: number;
}): QbMock {
  const qb: QbMock = {};
  for (const method of CHAIN_METHODS) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getRawMany = jest.fn().mockResolvedValue(result.raw ?? []);
  qb.getMany = jest.fn().mockResolvedValue(result.many ?? []);
  qb.getManyAndCount = jest
    .fn()
    .mockResolvedValue([result.many ?? [], result.count ?? 0]);
  return qb;
}

/** Condiciones `andWhere` de un query builder mock, como texto. */
function conditions(qb: QbMock): string[] {
  return qb.andWhere.mock.calls.map((call: unknown[]) => String(call[0]));
}

function paramsOf(qb: QbMock): Record<string, unknown> {
  return Object.assign(
    {},
    ...[...qb.where.mock.calls, ...qb.andWhere.mock.calls]
      .map((call: unknown[]) => call[1] as Record<string, unknown> | undefined)
      .filter(Boolean),
  ) as Record<string, unknown>;
}

function taxRow(partial: Partial<TaxLiabilityRawRow>): TaxLiabilityRawRow {
  return {
    tax_id: 1,
    receipt_id: 1,
    receipt_item_id: null,
    name: 'VAT 19%',
    rate: '19.00',
    amount: '0.00',
    scope: ReceiptTaxScope.RECEIPT,
    currency: 'USD',
    receipt_subtotal: '0.00',
    item_subtotal: null,
    ...partial,
  };
}

describe('BillingReportsService', () => {
  let service: BillingReportsService;

  const receiptTaxRepo = { createQueryBuilder: jest.fn() };
  const receiptRepo = { createQueryBuilder: jest.fn() };
  const userRepo = { find: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingReportsService,
        { provide: getRepositoryToken(ReceiptTax), useValue: receiptTaxRepo },
        { provide: getRepositoryToken(Receipt), useValue: receiptRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get(BillingReportsService);
  });

  describe('getTaxLiability', () => {
    it('rejects calls without a merchant', async () => {
      await expect(service.getTaxLiability({}, 0)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(receiptTaxRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('groups taxes by rate and scope and the totals match the sum of the groups', async () => {
      const rows = [
        // Receipt 1 (subtotal 100.00): VAT 19% on the receipt + liquor tax on one line.
        taxRow({ tax_id: 1, receipt_id: 1, amount: '19.00', receipt_subtotal: '100.00' }),
        taxRow({
          tax_id: 2,
          receipt_id: 1,
          receipt_item_id: 11,
          name: 'Liquor Tax',
          rate: '5.00',
          amount: '2.00',
          scope: ReceiptTaxScope.ITEM,
          receipt_subtotal: '100.00',
          item_subtotal: '40.00',
        }),
        // Receipt 2 (subtotal 50.10): VAT 19% + liquor tax twice on the same line (base counted once).
        taxRow({ tax_id: 3, receipt_id: 2, amount: '9.52', receipt_subtotal: '50.10' }),
        taxRow({
          tax_id: 4,
          receipt_id: 2,
          receipt_item_id: 21,
          name: 'liquor tax',
          rate: '5.00',
          amount: '0.51',
          scope: ReceiptTaxScope.ITEM,
          receipt_subtotal: '50.10',
          item_subtotal: '10.10',
        }),
        taxRow({
          tax_id: 5,
          receipt_id: 2,
          receipt_item_id: 21,
          name: 'Liquor Tax',
          rate: '5.00',
          amount: '0.01',
          scope: ReceiptTaxScope.ITEM,
          receipt_subtotal: '50.10',
          item_subtotal: '10.10',
        }),
        // Receipts 3 and 4: 0.10 + 0.20 must add up to exactly 0.30 (cents, not floats).
        taxRow({
          tax_id: 6,
          receipt_id: 3,
          name: 'City Tax',
          rate: '10.00',
          amount: '0.10',
          receipt_subtotal: '1.00',
        }),
        taxRow({
          tax_id: 7,
          receipt_id: 4,
          name: 'City Tax',
          rate: '10.00',
          amount: '0.20',
          receipt_subtotal: '2.00',
        }),
      ];
      receiptTaxRepo.createQueryBuilder.mockReturnValue(createQb({ raw: rows }));

      const result = await service.getTaxLiability({}, 1);

      expect(result.statusCode).toBe(200);
      const { groups, totals, totals_by_currency, currencies } = result.data;
      expect(currencies).toEqual(['USD']);
      expect(groups).toEqual([
        {
          name: 'VAT 19%',
          scope: ReceiptTaxScope.RECEIPT,
          rate: 19,
          currency: 'USD',
          taxable_subtotal: 150.1,
          tax_collected: 28.52,
          tax_lines: 2,
          receipts: 2,
          lines_without_base: 0,
        },
        {
          name: 'City Tax',
          scope: ReceiptTaxScope.RECEIPT,
          rate: 10,
          currency: 'USD',
          taxable_subtotal: 3,
          tax_collected: 0.3,
          tax_lines: 2,
          receipts: 2,
          lines_without_base: 0,
        },
        {
          name: 'Liquor Tax',
          scope: ReceiptTaxScope.ITEM,
          rate: 5,
          currency: 'USD',
          taxable_subtotal: 50.1,
          tax_collected: 2.52,
          tax_lines: 3,
          receipts: 2,
          lines_without_base: 0,
        },
      ]);

      const sum = (pick: (g: (typeof groups)[number]) => number) =>
        groups.reduce((s, g) => s + Math.round(pick(g) * 100), 0) / 100;
      expect(totals.tax_collected).toBe(sum((g) => g.tax_collected));
      expect(totals.taxable_subtotal).toBe(sum((g) => g.taxable_subtotal));
      expect(totals).toEqual({
        taxable_subtotal: 203.2,
        tax_collected: 31.34,
        tax_lines: 7,
        receipts: 4,
        groups: 3,
      });

      expect(totals_by_currency).toHaveLength(1);
      expect(totals_by_currency[0]).toMatchObject({
        currency: 'USD',
        taxable_subtotal: 203.2,
        tax_collected: 31.34,
        tax_lines: 7,
        receipts: 4,
        groups: 3,
      });
      expect(totals_by_currency[0].by_scope).toEqual([
        {
          scope: ReceiptTaxScope.RECEIPT,
          taxable_subtotal: 153.1,
          tax_collected: 28.82,
          tax_lines: 4,
        },
        {
          scope: ReceiptTaxScope.ITEM,
          taxable_subtotal: 50.1,
          tax_collected: 2.52,
          tax_lines: 3,
        },
      ]);
    });

    it('scopes by merchant, active receipts/taxes and applies every filter', async () => {
      const qb = createQb({ raw: [] });
      receiptTaxRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getTaxLiability(
        {
          from: '2026-01-01',
          to: '2026-01-31',
          rate: 19,
          scope: ReceiptTaxScope.ITEM,
          name: ' 50%_off ',
          currency: 'usd',
        },
        7,
      );

      expect(receiptTaxRepo.createQueryBuilder).toHaveBeenCalledWith('rt');
      expect(qb.innerJoin).toHaveBeenCalledWith('rt.receipt', 'r');
      expect(qb.leftJoin).toHaveBeenCalledWith('rt.receiptItem', 'ri');
      expect(qb.where).toHaveBeenCalledWith('r.merchant_id = :merchantId', {
        merchantId: 7,
      });
      expect(conditions(qb)).toEqual(
        expect.arrayContaining([
          'r.is_active = :active',
          'rt.is_active = :active',
          'r.created_at >= :reportFrom',
          // `to` without time includes the whole day → strictly before the next day.
          'r.created_at < :reportTo',
          'rt.rate = :rate',
          'rt.scope = :scope',
          `rt.name ILIKE :name ESCAPE '\\'`,
          'UPPER(r.currency) = :currency',
        ]),
      );
      expect(paramsOf(qb)).toMatchObject({
        active: true,
        reportFrom: '2026-01-01',
        reportTo: '2026-02-01',
        rate: 19,
        scope: ReceiptTaxScope.ITEM,
        name: '%50\\%\\_off%',
        currency: 'USD',
      });
      expect(result.data.filters).toEqual({
        from: '2026-01-01',
        to: '2026-01-31',
        rate: 19,
        scope: ReceiptTaxScope.ITEM,
        name: '50%_off',
        currency: 'USD',
      });
      expect(result.data.groups).toEqual([]);
      expect(result.data.totals).toEqual({
        taxable_subtotal: 0,
        tax_collected: 0,
        tax_lines: 0,
        receipts: 0,
        groups: 0,
      });
    });

    it('uses an inclusive upper bound when `to` carries a time', async () => {
      const qb = createQb({ raw: [] });
      receiptTaxRepo.createQueryBuilder.mockReturnValue(qb);

      await service.getTaxLiability({ to: '2026-01-31T18:00:00Z' }, 1);

      expect(conditions(qb)).toContain('r.created_at <= :reportTo');
      expect(paramsOf(qb).reportTo).toBe('2026-01-31T18:00:00Z');
    });

    it('rejects a date range where `from` is after `to`', async () => {
      receiptTaxRepo.createQueryBuilder.mockReturnValue(createQb({ raw: [] }));

      await expect(
        service.getTaxLiability({ from: '2026-02-01', to: '2026-01-01' }, 1),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('counts ITEM lines whose line item is gone as tax without base', async () => {
      receiptTaxRepo.createQueryBuilder.mockReturnValue(
        createQb({
          raw: [
            taxRow({
              receipt_id: 9,
              receipt_item_id: null,
              name: 'Liquor Tax',
              rate: '5.00',
              amount: '1.25',
              scope: ReceiptTaxScope.ITEM,
            }),
          ],
        }),
      );

      const { data } = await service.getTaxLiability({}, 1);

      expect(data.groups[0]).toMatchObject({
        taxable_subtotal: 0,
        tax_collected: 1.25,
        lines_without_base: 1,
      });
    });

    it('keeps currencies apart in groups and per-currency totals', async () => {
      receiptTaxRepo.createQueryBuilder.mockReturnValue(
        createQb({
          raw: [
            taxRow({ receipt_id: 1, amount: '19.00', receipt_subtotal: '100.00', currency: 'usd' }),
            taxRow({ receipt_id: 2, amount: '38.00', receipt_subtotal: '200.00', currency: 'EUR' }),
          ],
        }),
      );

      const { data } = await service.getTaxLiability({}, 1);

      expect(data.currencies).toEqual(['EUR', 'USD']);
      expect(data.groups.map((g) => g.currency)).toEqual(['EUR', 'USD']);
      expect(
        data.totals_by_currency.map((t) => [t.currency, t.tax_collected, t.receipts]),
      ).toEqual([
        ['EUR', 38, 1],
        ['USD', 19, 1],
      ]);
    });
  });

  describe('getDiscountAudit', () => {
    const discounted = {
      id: 10,
      order_id: 200,
      merchant_id: 1,
      type: ReceiptType.INVOICE,
      invoice_number: 'INV-000010',
      subtotal: '25.00',
      total_tax: '4.75',
      total_discount: '2.50',
      grand_total: '27.25',
      currency: 'usd',
      is_active: true,
      is_locked: true,
      processed_by_user_id: 7,
      processed_by_role: 'merchant_user',
      created_at: new Date('2026-01-15T08:00:00Z'),
      updated_at: new Date('2026-01-15T09:00:00Z'),
      order_snapshot: {
        orderId: 200,
        orderNumber: 'ORD-200',
        subtotal: 25,
        discountTotal: 2.5,
        total: 27.25,
        items: [
          { productName: 'Burger Combo', quantity: 2 },
          { product_id: 5, quantity: 1 },
        ],
        payments: [{ method: 'cash' }, { method: 'card' }, { method: 'cash' }],
      },
    };
    const voided = {
      ...discounted,
      id: 11,
      invoice_number: 'INV-000011',
      subtotal: '10.00',
      total_tax: '1.90',
      total_discount: '0.00',
      grand_total: '11.90',
      is_active: false,
      is_locked: false,
      processed_by_user_id: null,
      processed_by_role: null,
      order_snapshot: null,
    };
    const summaryRaw = [
      {
        currency: 'USD',
        receipts: '2',
        discounted: '1',
        voided: '1',
        original_subtotal: '35.00',
        discount_applied: '2.50',
        total_tax: '6.65',
        final_total: '39.15',
      },
    ];

    function mockAuditQueries(rowsQb: QbMock, summaryQb: QbMock) {
      receiptRepo.createQueryBuilder
        .mockReturnValueOnce(rowsQb)
        .mockReturnValueOnce(summaryQb);
    }

    it('rejects calls without a merchant', async () => {
      await expect(service.getDiscountAudit({}, 0)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('lists discounted and voided receipts with user, original subtotal, discount and final total', async () => {
      const rowsQb = createQb({ many: [discounted, voided], count: 2 });
      const summaryQb = createQb({ raw: summaryRaw });
      mockAuditQueries(rowsQb, summaryQb);
      userRepo.find.mockResolvedValue([
        { id: 7, username: 'cashier_ana', email: 'ana@example.com' },
      ]);

      const result = await service.getDiscountAudit({}, 1);

      expect(rowsQb.where).toHaveBeenCalledWith('r.merchant_id = :merchantId', {
        merchantId: 1,
      });
      expect(conditions(rowsQb)).toContain(
        '(r.total_discount > 0 OR r.is_active = :inactive)',
      );
      expect(userRepo.find).toHaveBeenCalledWith({
        where: { id: In([7]) },
        select: { id: true, username: true, email: true },
      });

      expect(result.data[0]).toMatchObject({
        receipt_id: 10,
        invoice_number: 'INV-000010',
        receipt_type: ReceiptType.INVOICE,
        currency: 'USD',
        events: [DiscountAuditEvent.DISCOUNT],
        processed_by_user_id: 7,
        processed_by_role: 'merchant_user',
        processed_by_name: 'cashier_ana',
        original_subtotal: 25,
        discount_applied: 2.5,
        discount_pct: 10,
        total_tax: 4.75,
        final_total: 27.25,
        is_active: true,
        is_locked: true,
        created_at: '2026-01-15T08:00:00.000Z',
        snapshot: {
          order_id: 200,
          order_number: 'ORD-200',
          item_count: 2,
          items_summary: '2 x Burger Combo; 1 x Product #5',
          payment_methods: 'cash, card',
          subtotal: 25,
          discount_total: 2.5,
          total: 27.25,
        },
      });
      expect(result.data[0].order_snapshot).toEqual(discounted.order_snapshot);

      expect(result.data[1]).toMatchObject({
        receipt_id: 11,
        events: [DiscountAuditEvent.VOID],
        is_active: false,
        processed_by_user_id: null,
        processed_by_name: null,
        original_subtotal: 10,
        discount_applied: 0,
        discount_pct: 0,
        final_total: 11.9,
        snapshot: null,
        order_snapshot: null,
      });

      expect(result.summary).toEqual({
        receipts: 2,
        discounted_receipts: 1,
        voided_receipts: 1,
        by_currency: [
          {
            currency: 'USD',
            receipts: 2,
            original_subtotal: 35,
            discount_applied: 2.5,
            total_tax: 6.65,
            final_total: 39.15,
          },
        ],
      });
      expect(summaryQb.groupBy).toHaveBeenCalledWith('UPPER(r.currency)');
      expect(result).toMatchObject({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('filters by event type, date range, user, receipt type and currency', async () => {
      const rowsQb = createQb({ many: [], count: 0 });
      mockAuditQueries(rowsQb, createQb({ raw: [] }));

      const result = await service.getDiscountAudit(
        {
          eventType: DiscountAuditEventType.VOID,
          from: '2026-01-01',
          to: '2026-01-31',
          userId: 7,
          receiptType: ReceiptType.RECEIPT,
          currency: 'eur',
        },
        1,
      );

      expect(conditions(rowsQb)).toEqual(
        expect.arrayContaining([
          'r.is_active = :inactive',
          'r.created_at >= :reportFrom',
          'r.created_at < :reportTo',
          'r.processed_by_user_id = :userId',
          'r.type = :receiptType',
          'UPPER(r.currency) = :currency',
        ]),
      );
      expect(paramsOf(rowsQb)).toMatchObject({
        inactive: false,
        reportFrom: '2026-01-01',
        reportTo: '2026-02-01',
        userId: 7,
        receiptType: ReceiptType.RECEIPT,
        currency: 'EUR',
      });
      expect(userRepo.find).not.toHaveBeenCalled();
      expect(result.filters).toEqual({
        from: '2026-01-01',
        to: '2026-01-31',
        event_type: DiscountAuditEventType.VOID,
        user_id: 7,
        receipt_type: ReceiptType.RECEIPT,
        currency: 'EUR',
      });
      expect(result.totalPages).toBe(0);
    });

    it('only discount events when eventType=discount', async () => {
      const rowsQb = createQb({ many: [], count: 0 });
      mockAuditQueries(rowsQb, createQb({ raw: [] }));

      await service.getDiscountAudit(
        { eventType: DiscountAuditEventType.DISCOUNT },
        1,
      );

      expect(conditions(rowsQb)).toContain('r.total_discount > 0');
      expect(conditions(rowsQb)).not.toContain(
        '(r.total_discount > 0 OR r.is_active = :inactive)',
      );
    });

    it('paginates the rows while the summary covers the whole filter', async () => {
      const rowsQb = createQb({ many: [discounted], count: 25 });
      const summaryQb = createQb({ raw: summaryRaw });
      mockAuditQueries(rowsQb, summaryQb);
      userRepo.find.mockResolvedValue([]);

      const result = await service.getDiscountAudit({ page: 2, limit: 10 }, 1);

      expect(rowsQb.skip).toHaveBeenCalledWith(10);
      expect(rowsQb.take).toHaveBeenCalledWith(10);
      expect(rowsQb.orderBy).toHaveBeenCalledWith('r.created_at', 'DESC');
      expect(summaryQb.skip).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
      // Without a user record the name falls back to null but the id stays.
      expect(result.data[0].processed_by_name).toBeNull();
      expect(result.data[0].processed_by_user_id).toBe(7);
    });

    it('returns every row (no skip/take) for the CSV export', async () => {
      const rowsQb = createQb({ many: [discounted, voided] });
      mockAuditQueries(rowsQb, createQb({ raw: summaryRaw }));
      userRepo.find.mockResolvedValue([]);

      const result = await service.getDiscountAudit({ page: 3, limit: 1 }, 1, {
        paginate: false,
      });

      expect(rowsQb.skip).not.toHaveBeenCalled();
      expect(rowsQb.take).not.toHaveBeenCalled();
      expect(rowsQb.getMany).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result).toMatchObject({ page: 1, total: 2, totalPages: 1 });
    });
  });
});
