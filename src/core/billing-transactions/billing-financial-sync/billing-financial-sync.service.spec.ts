import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { JournalEntry } from 'src/core/financial-engine/journal-entry/entities/journal-entry.entity';
import { JournalEntryLine } from 'src/core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';
import { LedgerAccount } from 'src/core/financial-engine/ledger-accounts/entities/ledger-account.entity';
import { AccountType } from 'src/core/financial-engine/ledger-accounts/constants/account-type.enum';
import { JournalEntryStatus } from 'src/core/financial-engine/journal-entry/constants/journal-entry-status.enum';
import { JournalEntryReferenceType } from 'src/core/financial-engine/journal-entry/constants/journal-entry-reference-type.enum';

import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptType } from '../receipts/constants/receipt-type.enum';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { ReceiptTaxScope } from '../receipt-tax/constants/receipt-tax-scope.enum';
import {
  BillingFinancialSyncService,
  postingStatusCondition,
} from './billing-financial-sync.service';
import { ReceiptPostingStatus } from './constants/posting-status.enum';

const MERCHANT_ID = 7;
const COMPANY_ID = 70;

function account(
  id: number,
  code: string,
  name: string,
  type: AccountType,
): LedgerAccount {
  return {
    id,
    code,
    name,
    type,
    company_id: COMPANY_ID,
    is_active: true,
  } as LedgerAccount;
}

const CASH = account(1, '1100', 'Cash', AccountType.ASSET);
const DISCOUNTS = account(2, '4900', 'Sales discounts', AccountType.EXPENSE);
const SALES = account(3, '4000', 'Sales', AccountType.REVENUE);
const VAT = account(4, '2100', 'VAT payable', AccountType.LIABILITY);

function line(
  id: number,
  acc: LedgerAccount,
  debit: string,
  credit: string,
  entryId = 100,
): JournalEntryLine {
  return {
    id,
    journal_entry_id: entryId,
    account_id: acc.id,
    account: acc,
    debit,
    credit,
    description: `${acc.name} line`,
    is_active: true,
  } as unknown as JournalEntryLine;
}

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  return {
    id: 10,
    merchant_id: MERCHANT_ID,
    order_id: 1,
    type: ReceiptType.INVOICE,
    invoice_number: 'INV-000010',
    currency: 'USD',
    subtotal: '25.00',
    total_tax: '4.28',
    total_discount: '2.50',
    grand_total: '26.78',
    is_active: true,
    is_locked: true,
    created_at: new Date('2026-11-20T10:00:00Z'),
    ...overrides,
  } as unknown as Receipt;
}

function tax(id: number, receiptId: number, amount: string): ReceiptTax {
  return {
    id,
    receipt_id: receiptId,
    receipt_item_id: null,
    name: `Tax ${id}`,
    rate: '19.00',
    amount,
    scope: ReceiptTaxScope.RECEIPT,
    is_active: true,
  } as unknown as ReceiptTax;
}

function entry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 100,
    company_id: COMPANY_ID,
    entry_number: 'RCPT-INV-000010',
    entry_date: '2026-11-20',
    status: JournalEntryStatus.POSTED,
    total_debit: '29.28',
    total_credit: '29.28',
    reference_type: JournalEntryReferenceType.RECEIPT,
    reference_id: 10,
    is_active: true,
    lines: [
      line(1, CASH, '26.78', '0.00'),
      line(2, DISCOUNTS, '2.50', '0.00'),
      line(3, SALES, '0.00', '25.00'),
      line(4, VAT, '0.00', '4.28'),
    ],
    ...overrides,
  } as unknown as JournalEntry;
}

describe('BillingFinancialSyncService', () => {
  let service: BillingFinancialSyncService;

  const qb = {
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getManyAndCount: jest.fn(),
  };
  const receiptRepo = {
    createQueryBuilder: jest.fn(() => qb),
    findOne: jest.fn(),
  };
  const receiptTaxRepo = { find: jest.fn() };
  const journalEntryRepo = { find: jest.fn() };
  const merchantRepo = { findOne: jest.fn() };
  const ledgerAccountRepo = { find: jest.fn() };

  // Repositorios dentro de dataSource.transaction (POST BATCH TO LEDGER)
  const lockQb = {
    setLock: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    limit: jest.fn(),
    getMany: jest.fn(),
  };
  const numbersQb = {
    select: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    getRawMany: jest.fn(),
  };
  const txEntryRepo = {
    find: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => numbersQb),
  };
  const txReceiptRepo = { createQueryBuilder: jest.fn(() => lockQb) };
  const txLineRepo = { create: jest.fn((value: unknown) => value) };
  const manager = {
    getRepository: jest.fn((entity: unknown) =>
      entity === Receipt
        ? txReceiptRepo
        : entity === JournalEntry
          ? txEntryRepo
          : txLineRepo,
    ),
  };
  const dataSource = {
    query: jest.fn(),
    transaction: jest.fn((work: (m: typeof manager) => Promise<unknown>) =>
      work(manager),
    ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    for (const key of [
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ] as const) {
      qb[key].mockReturnValue(qb);
    }
    for (const key of [
      'setLock',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'limit',
    ] as const) {
      lockQb[key].mockReturnValue(lockQb);
    }
    for (const key of ['select', 'where', 'andWhere'] as const) {
      numbersQb[key].mockReturnValue(numbersQb);
    }
    numbersQb.getRawMany.mockResolvedValue([]);
    txEntryRepo.find.mockResolvedValue([]);
    merchantRepo.findOne.mockResolvedValue({
      id: MERCHANT_ID,
      companyId: COMPANY_ID,
    } as Merchant);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingFinancialSyncService,
        { provide: getRepositoryToken(Receipt), useValue: receiptRepo },
        { provide: getRepositoryToken(ReceiptTax), useValue: receiptTaxRepo },
        {
          provide: getRepositoryToken(JournalEntry),
          useValue: journalEntryRepo,
        },
        { provide: getRepositoryToken(Merchant), useValue: merchantRepo },
        {
          provide: getRepositoryToken(LedgerAccount),
          useValue: ledgerAccountRepo,
        },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(BillingFinancialSyncService);
  });

  describe('findAll (grid)', () => {
    it('associates receipt totals with ledger accounts and returns balance verification flags', async () => {
      const posted = receipt();
      const unposted = receipt({ id: 11, invoice_number: 'INV-000011' });
      qb.getManyAndCount.mockResolvedValue([[posted, unposted], 2]);
      receiptTaxRepo.find.mockResolvedValue([
        tax(1, 10, '3.00'),
        tax(2, 10, '1.28'),
        tax(3, 11, '4.28'),
      ]);
      journalEntryRepo.find.mockResolvedValue([entry()]);

      const result = await service.findAll({ page: 1, limit: 10 }, MERCHANT_ID);

      expect(result).toMatchObject({
        statusCode: 200,
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
      const [row, emptyRow] = result.data;

      expect(row).toMatchObject({
        receipt_id: 10,
        invoice_number: 'INV-000010',
        grand_total: 26.78,
        total_tax: 4.28,
        posting_status: ReceiptPostingStatus.POSTED,
        ledger_account_ids: [1, 4, 3, 2],
        ledger_total_debit: 29.28,
        ledger_total_credit: 29.28,
        asset_net_debit: 26.78,
        liability_net_credit: 4.28,
        receipt_taxes_total: 4.28,
        verification: {
          receipt_totals_consistent: true,
          receipt_taxes_match_total: true,
          entries_balanced: true,
          grand_total_matches_assets: true,
          tax_matches_liabilities: true,
          is_balanced: true,
        },
      });
      expect(row.receipt_taxes).toHaveLength(2);
      expect(row.journal_entries).toEqual([
        expect.objectContaining({
          id: 100,
          entry_number: 'RCPT-INV-000010',
          status: JournalEntryStatus.POSTED,
          is_balanced: true,
          line_count: 4,
        }),
      ]);
      expect(row.ledger_accounts).toContainEqual({
        account_id: 1,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
        debit: 26.78,
        credit: 0,
      });
      expect(row.ledger_accounts).toContainEqual({
        account_id: 4,
        code: '2100',
        name: 'VAT payable',
        type: AccountType.LIABILITY,
        debit: 0,
        credit: 4.28,
      });

      expect(emptyRow).toMatchObject({
        receipt_id: 11,
        posting_status: ReceiptPostingStatus.UNPOSTED,
        journal_entries: [],
        ledger_account_ids: [],
        verification: {
          entries_balanced: null,
          is_balanced: null,
          receipt_taxes_match_total: true,
        },
      });

      // Recibos del merchant; asientos de la compañía enlazados con reference_type RECEIPT
      expect(qb.where).toHaveBeenCalledWith(
        'receipt.merchant_id = :merchantId',
        { merchantId: MERCHANT_ID },
      );
      expect(journalEntryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: COMPANY_ID,
            reference_type: JournalEntryReferenceType.RECEIPT,
            is_active: true,
          }),
        }),
      );
    });

    it('excludes voided entries from the verification but still lists them', async () => {
      qb.getManyAndCount.mockResolvedValue([[receipt()], 1]);
      receiptTaxRepo.find.mockResolvedValue([tax(1, 10, '4.28')]);
      journalEntryRepo.find.mockResolvedValue([
        entry({
          id: 99,
          status: JournalEntryStatus.VOIDED,
          entry_number: 'RCPT-INV-000010-OLD',
          lines: [line(9, CASH, '99.00', '0.00', 99)],
        }),
        entry(),
      ]);

      const [row] = (await service.findAll({}, MERCHANT_ID)).data;
      expect(row.journal_entries.map((e) => e.status)).toEqual([
        JournalEntryStatus.VOIDED,
        JournalEntryStatus.POSTED,
      ]);
      expect(row.verification.is_balanced).toBe(true);
      expect(row.ledger_total_debit).toBe(29.28);
    });

    it('reports PENDING and unbalanced flags for a draft entry whose credits do not match', async () => {
      qb.getManyAndCount.mockResolvedValue([[receipt()], 1]);
      receiptTaxRepo.find.mockResolvedValue([tax(1, 10, '4.28')]);
      journalEntryRepo.find.mockResolvedValue([
        entry({
          status: JournalEntryStatus.DRAFT,
          lines: [
            line(1, CASH, '26.78', '0.00'),
            line(3, SALES, '0.00', '25.00'),
          ],
        }),
      ]);

      const [row] = (await service.findAll({}, MERCHANT_ID)).data;
      expect(row.posting_status).toBe(ReceiptPostingStatus.PENDING);
      expect(row.verification).toMatchObject({
        entries_balanced: false,
        grand_total_matches_assets: true,
        tax_matches_liabilities: false,
        is_balanced: false,
      });
      expect(row.journal_entries[0].is_balanced).toBe(false);
    });

    it('applies search, date range and posting status filters and paginates', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll(
        {
          page: 2,
          limit: 10,
          search: ' inv_1 ',
          dateFrom: '2026-11-01',
          dateTo: '2026-11-30',
          postingStatus: ReceiptPostingStatus.UNPOSTED,
        },
        MERCHANT_ID,
      );

      expect(qb.andWhere).toHaveBeenCalledWith(
        'receipt.invoice_number ILIKE :search',
        { search: '%inv\\_1%' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'receipt.created_at >= CAST(:dateFrom AS date)',
        { dateFrom: '2026-11-01' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        `receipt.created_at < CAST(:dateTo AS date) + INTERVAL '1 day'`,
        { dateTo: '2026-11-30' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        postingStatusCondition(ReceiptPostingStatus.UNPOSTED),
        expect.objectContaining({
          companyId: COMPANY_ID,
          receiptRef: JournalEntryReferenceType.RECEIPT,
          voidedStatus: JournalEntryStatus.VOIDED,
        }),
      );
      expect(qb.skip).toHaveBeenCalledWith(10);
      expect(qb.take).toHaveBeenCalledWith(10);
      expect(receiptTaxRepo.find).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        data: [],
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('rejects an inverted date range', async () => {
      await expect(
        service.findAll(
          { dateFrom: '2026-12-01', dateTo: '2026-11-01' },
          MERCHANT_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires a merchant that belongs to a company', async () => {
      merchantRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findAll({}, MERCHANT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      merchantRepo.findOne.mockResolvedValueOnce({
        id: MERCHANT_ID,
        companyId: null,
      });
      await expect(service.findAll({}, MERCHANT_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('postingStatusCondition', () => {
    it('builds the SQL of each posting status over linked RECEIPT entries', () => {
      expect(postingStatusCondition(ReceiptPostingStatus.POSTED)).toContain(
        'je.status = :postedStatus',
      );
      expect(postingStatusCondition(ReceiptPostingStatus.POSTED)).toContain(
        'AND NOT EXISTS',
      );
      expect(postingStatusCondition(ReceiptPostingStatus.PENDING)).toContain(
        'je.status = :draftStatus',
      );
      expect(postingStatusCondition(ReceiptPostingStatus.UNPOSTED)).toMatch(
        /^NOT EXISTS .*je\.status <> :voidedStatus/,
      );
      expect(postingStatusCondition(ReceiptPostingStatus.UNPOSTED)).toContain(
        'je.reference_id = receipt.id',
      );
    });
  });

  describe('findLines (drill-down)', () => {
    it('returns the journal entry lines of the receipt with their ledger account', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt());
      journalEntryRepo.find.mockResolvedValue([entry()]);

      const result = await service.findLines(10, {}, MERCHANT_ID);

      expect(receiptRepo.findOne).toHaveBeenCalledWith({
        where: { id: 10, merchant_id: MERCHANT_ID, is_active: true },
      });
      expect(result.data).toMatchObject({
        receipt_id: 10,
        invoice_number: 'INV-000010',
        currency: 'USD',
        journal_entry_id: null,
        total_debit: 29.28,
        total_credit: 29.28,
        is_balanced: true,
      });
      expect(result.data.lines).toHaveLength(4);
      expect(result.data.lines[0]).toEqual({
        id: 1,
        journal_entry_id: 100,
        entry_number: 'RCPT-INV-000010',
        entry_status: JournalEntryStatus.POSTED,
        account: { id: 1, code: '1100', name: 'Cash', type: AccountType.ASSET },
        debit: 26.78,
        credit: 0,
        description: 'Cash line',
      });
    });

    it('filters by journal entry and 404s when the entry is not linked to the receipt', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt());
      journalEntryRepo.find.mockResolvedValueOnce([entry()]);

      const result = await service.findLines(
        10,
        { journalEntryId: 100 },
        MERCHANT_ID,
      );
      expect(journalEntryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 100, company_id: COMPANY_ID }),
        }),
      );
      expect(result.data.journal_entry_id).toBe(100);

      journalEntryRepo.find.mockResolvedValueOnce([]);
      await expect(
        service.findLines(10, { journalEntryId: 555 }, MERCHANT_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s for receipts of another merchant', async () => {
      receiptRepo.findOne.mockResolvedValue(null);
      await expect(
        service.findLines(10, {}, MERCHANT_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists voided entries but keeps them out of the totals', async () => {
      receiptRepo.findOne.mockResolvedValue(receipt());
      journalEntryRepo.find.mockResolvedValue([
        entry({
          id: 99,
          status: JournalEntryStatus.VOIDED,
          lines: [line(9, CASH, '5.00', '0.00', 99)],
        }),
        entry(),
      ]);

      const result = await service.findLines(10, {}, MERCHANT_ID);
      expect(result.data.lines).toHaveLength(5);
      expect(result.data.total_debit).toBe(29.28);
    });
  });

  // ─── Historia 2 ──────────────────────────────────────────────────────────

  interface MetricsFixture {
    counts: Record<string, unknown>;
    entries: Record<string, unknown>;
    taxAccounts: Array<Record<string, unknown>>;
    ledger: Array<Record<string, unknown>>;
  }

  const balancedLedgerRow = {
    receipt_id: 10,
    subtotal: '25.00',
    total_tax: '4.28',
    total_discount: '2.50',
    grand_total: '26.78',
    tax_records: '4.28',
    debit: '29.28',
    credit: '29.28',
    asset_net_debit: '26.78',
    liability_net_credit: '4.28',
  };

  function mockMetrics(fixture: Partial<MetricsFixture> = {}) {
    const data: MetricsFixture = {
      counts: {
        total_receipts: 5,
        posted_receipts: 3,
        pending_receipts: 1,
        unposted_receipts: 1,
        posted_grand_total: '80.34',
        currency: 'EUR',
      },
      entries: {
        posted_entries: 3,
        pending_entries: 2,
        posted_revenue: '75.00',
      },
      taxAccounts: [
        { account_id: 4, code: '2100', name: 'VAT payable', balance: '12.84' },
        {
          account_id: 5,
          code: '2110',
          name: 'City tax payable',
          balance: '1.00',
        },
      ],
      ledger: [balancedLedgerRow],
      ...fixture,
    };
    dataSource.query.mockImplementation((sql: string) => {
      if (sql.includes('CROSS JOIN LATERAL'))
        return Promise.resolve([data.counts]);
      if (sql.includes('posted_revenue'))
        return Promise.resolve([data.entries]);
      if (sql.includes('ORDER BY a.code'))
        return Promise.resolve(data.taxAccounts);
      if (sql.includes('tax_records')) return Promise.resolve(data.ledger);
      return Promise.resolve([]);
    });
  }

  describe('getMetrics (header KPIs)', () => {
    it('summarizes posted revenue, pending entries, tax account balances and the balance status', async () => {
      mockMetrics();

      const { data } = await service.getMetrics(MERCHANT_ID);

      expect(data).toEqual({
        currency: 'EUR',
        total_receipts: 5,
        posted_receipts: 3,
        pending_receipts: 1,
        unposted_receipts: 1,
        unposted_transactions: 2,
        pending_ledger_entries: 2,
        posted_ledger_entries: 3,
        posted_revenue: 75,
        posted_grand_total: 80.34,
        tax_accounts: [
          { account_id: 4, code: '2100', name: 'VAT payable', balance: 12.84 },
          { account_id: 5, code: '2110', name: 'City tax payable', balance: 1 },
        ],
        tax_liability_balance: 13.84,
        balance: {
          status: 'BALANCED',
          checked_receipts: 1,
          balanced_receipts: 1,
          unbalanced_receipts: 0,
        },
      });
      // Todas las consultas van acotadas al merchant y a su compañía
      for (const [, params] of dataSource.query.mock.calls) {
        expect((params as unknown[]).slice(0, 2)).toEqual([
          MERCHANT_ID,
          COMPANY_ID,
        ]);
      }
    });

    it('reports UNBALANCED when a receipt does not reconcile and NO_ENTRIES without postings', async () => {
      mockMetrics({
        ledger: [
          balancedLedgerRow,
          { ...balancedLedgerRow, receipt_id: 11, credit: '29.00' },
        ],
      });
      expect((await service.getMetrics(MERCHANT_ID)).data.balance).toEqual({
        status: 'UNBALANCED',
        checked_receipts: 2,
        balanced_receipts: 1,
        unbalanced_receipts: 1,
      });

      mockMetrics({ ledger: [], taxAccounts: [] });
      const { data } = await service.getMetrics(MERCHANT_ID);
      expect(data.balance.status).toBe('NO_ENTRIES');
      expect(data.tax_liability_balance).toBe(0);
    });
  });

  describe('getPostingAccounts', () => {
    it('lists the active company accounts usable by the batch', async () => {
      ledgerAccountRepo.find.mockResolvedValue([CASH, VAT, SALES, DISCOUNTS]);

      const { data } = await service.getPostingAccounts(MERCHANT_ID);

      expect(ledgerAccountRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            company_id: COMPANY_ID,
            is_active: true,
          }),
          order: { code: 'ASC' },
        }),
      );
      expect(data[0]).toEqual({
        id: 1,
        code: '1100',
        name: 'Cash',
        type: AccountType.ASSET,
      });
      expect(data).toHaveLength(4);
    });
  });

  describe('postBatch (POST BATCH TO LEDGER)', () => {
    const DTO = {
      cashAccountId: CASH.id,
      revenueAccountId: SALES.id,
      taxAccountId: VAT.id,
      discountAccountId: DISCOUNTS.id,
    };

    beforeEach(() => {
      ledgerAccountRepo.find.mockResolvedValue([CASH, SALES, VAT, DISCOUNTS]);
      txEntryRepo.save.mockImplementation((entity: Record<string, unknown>) =>
        Promise.resolve({ ...entity, id: 500 }),
      );
      mockMetrics();
    });

    it('generates and posts a balanced sales entry per unposted receipt and returns refreshed metrics', async () => {
      lockQb.getMany.mockResolvedValue([
        receipt({ created_at: new Date(2026, 10, 20, 23, 30) }),
      ]);

      const result = await service.postBatch(DTO, MERCHANT_ID);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(lockQb.setLock).toHaveBeenCalledWith('pessimistic_write');
      expect(lockQb.andWhere).toHaveBeenCalledWith(
        `NOT (${postingStatusCondition(ReceiptPostingStatus.POSTED)})`,
        expect.objectContaining({ companyId: COMPANY_ID }),
      );
      expect(txEntryRepo.save).toHaveBeenCalledTimes(1);
      expect(txEntryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          company_id: COMPANY_ID,
          entry_number: 'RCPT-INV-000010',
          entry_date: '2026-11-20',
          status: JournalEntryStatus.POSTED,
          reference_type: JournalEntryReferenceType.RECEIPT,
          reference_id: 10,
          total_debit: 29.28,
          total_credit: 29.28,
          lines: [
            expect.objectContaining({
              account_id: CASH.id,
              debit: 26.78,
              credit: 0,
            }),
            expect.objectContaining({
              account_id: DISCOUNTS.id,
              debit: 2.5,
              credit: 0,
            }),
            expect.objectContaining({
              account_id: SALES.id,
              debit: 0,
              credit: 25,
            }),
            expect.objectContaining({
              account_id: VAT.id,
              debit: 0,
              credit: 4.28,
            }),
          ],
        }),
      );
      expect(result.statusCode).toBe(201);
      expect(result.data).toMatchObject({
        generated_entries: 1,
        posted_drafts: 0,
        skipped: [],
        entries: [
          {
            id: 500,
            entry_number: 'RCPT-INV-000010',
            receipt_id: 10,
            status: JournalEntryStatus.POSTED,
            generated: true,
          },
        ],
      });
      // Los contadores del header vuelven ya recalculados en la misma respuesta
      expect(result.data.metrics).toMatchObject({
        posted_receipts: 3,
        unposted_transactions: 2,
        pending_ledger_entries: 2,
      });
      expect(dataSource.query).toHaveBeenCalled();
      expect(dataSource.transaction.mock.invocationCallOrder[0]).toBeLessThan(
        dataSource.query.mock.invocationCallOrder[0],
      );
    });

    it('is idempotent: receipts that are already posted are skipped', async () => {
      lockQb.getMany.mockResolvedValue([receipt()]);
      txEntryRepo.find.mockResolvedValue([entry()]);

      const result = await service.postBatch(DTO, MERCHANT_ID);

      expect(txEntryRepo.save).not.toHaveBeenCalled();
      expect(txEntryRepo.update).not.toHaveBeenCalled();
      expect(result.data.skipped).toEqual([
        expect.objectContaining({ receipt_id: 10, reason: 'ALREADY_POSTED' }),
      ]);
      expect(result.data.generated_entries).toBe(0);
    });

    it('re-posts a receipt whose only entry was voided', async () => {
      lockQb.getMany.mockResolvedValue([receipt()]);
      txEntryRepo.find.mockResolvedValue([
        entry({ status: JournalEntryStatus.VOIDED }),
      ]);
      numbersQb.getRawMany.mockResolvedValue([
        { entry_number: 'RCPT-INV-000010' },
      ]);

      const result = await service.postBatch(DTO, MERCHANT_ID);

      expect(txEntryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ entry_number: 'RCPT-INV-000010-2' }),
      );
      expect(result.data.generated_entries).toBe(1);
    });

    it('posts balanced DRAFT entries of pending receipts and skips unbalanced drafts', async () => {
      lockQb.getMany.mockResolvedValue([
        receipt(),
        receipt({ id: 11, invoice_number: 'INV-000011' }),
      ]);
      txEntryRepo.find.mockResolvedValue([
        entry({ id: 100, status: JournalEntryStatus.DRAFT }),
        entry({
          id: 101,
          reference_id: 11,
          entry_number: 'MANUAL-11',
          status: JournalEntryStatus.DRAFT,
          lines: [
            line(1, CASH, '10.00', '0.00', 101),
            line(2, SALES, '0.00', '9.00', 101),
          ],
        }),
      ]);

      const result = await service.postBatch(DTO, MERCHANT_ID);

      expect(txEntryRepo.update).toHaveBeenCalledTimes(1);
      expect(txEntryRepo.update).toHaveBeenCalledWith(
        { id: 100 },
        { status: JournalEntryStatus.POSTED },
      );
      expect(txEntryRepo.save).not.toHaveBeenCalled();
      expect(result.data).toMatchObject({
        generated_entries: 0,
        posted_drafts: 1,
        entries: [
          {
            id: 100,
            generated: false,
            total_debit: 29.28,
            total_credit: 29.28,
          },
        ],
        skipped: [{ receipt_id: 11, reason: 'UNBALANCED_DRAFT' }],
      });
    });

    it('skips receipts that need a missing account or whose totals do not add up', async () => {
      lockQb.getMany.mockResolvedValue([
        receipt(),
        receipt({
          id: 12,
          invoice_number: 'INV-000012',
          grand_total: 30 as unknown as number,
        }),
        receipt({
          id: 13,
          invoice_number: 'INV-000013',
          subtotal: 10 as unknown as number,
          total_tax: 0 as unknown as number,
          total_discount: 0 as unknown as number,
          grand_total: 10 as unknown as number,
        }),
      ]);

      const result = await service.postBatch(
        { cashAccountId: CASH.id, revenueAccountId: SALES.id },
        MERCHANT_ID,
      );

      expect(result.data.skipped).toEqual([
        expect.objectContaining({
          receipt_id: 10,
          reason: 'MISSING_TAX_ACCOUNT',
        }),
        expect.objectContaining({
          receipt_id: 12,
          reason: 'UNBALANCED_TOTALS',
        }),
      ]);
      expect(txEntryRepo.save).toHaveBeenCalledTimes(1);
      expect(txEntryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          reference_id: 13,
          lines: [
            expect.objectContaining({ account_id: CASH.id, debit: 10 }),
            expect.objectContaining({ account_id: SALES.id, credit: 10 }),
          ],
        }),
      );
    });

    it('locks only the requested receipts and reports the ones not found', async () => {
      lockQb.getMany.mockResolvedValue([receipt()]);

      const result = await service.postBatch(
        { ...DTO, receiptIds: [10, 99] },
        MERCHANT_ID,
      );

      expect(lockQb.where).toHaveBeenCalledWith(
        'receipt.merchant_id = :merchantId',
        { merchantId: MERCHANT_ID },
      );
      expect(lockQb.andWhere).toHaveBeenCalledWith(
        'receipt.id IN (:...receiptIds)',
        { receiptIds: [10, 99] },
      );
      expect(result.data.skipped).toEqual([
        expect.objectContaining({ receipt_id: 99, reason: 'NOT_FOUND' }),
      ]);
      expect(result.data.generated_entries).toBe(1);
    });

    it('validates that every account belongs to the company, is active and has the right type', async () => {
      ledgerAccountRepo.find.mockResolvedValueOnce([CASH, SALES, DISCOUNTS]);
      await expect(service.postBatch(DTO, MERCHANT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      ledgerAccountRepo.find.mockResolvedValueOnce([
        CASH,
        SALES,
        VAT,
        DISCOUNTS,
      ]);
      await expect(
        service.postBatch(
          { ...DTO, cashAccountId: VAT.id, taxAccountId: VAT.id },
          MERCHANT_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(ledgerAccountRepo.find).toHaveBeenCalledWith({
        where: expect.objectContaining({
          company_id: COMPANY_ID,
          is_active: true,
        }),
      });
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });
});
