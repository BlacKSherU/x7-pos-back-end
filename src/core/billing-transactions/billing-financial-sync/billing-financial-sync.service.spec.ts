import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
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
});
