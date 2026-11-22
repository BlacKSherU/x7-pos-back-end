import { AccountType } from 'src/core/financial-engine/ledger-accounts/constants/account-type.enum';
import { JournalEntryStatus } from 'src/core/financial-engine/journal-entry/constants/journal-entry-status.enum';

import { ReceiptPostingStatus } from './constants/posting-status.enum';
import {
  LedgerLineInput,
  aggregateByAccount,
  calendarDate,
  entryNumberBase,
  escapeLike,
  pickEntryNumber,
  planReceiptPosting,
  verifyLedgerAggregates,
  fromCents,
  postingStatusOf,
  reconcileReceipt,
  toCents,
} from './billing-financial-sync.calculations';

// Recibo de referencia: 25.00 + 4.28 de impuesto − 2.50 de descuento = 26.78
const RECEIPT = {
  subtotal: '25.00',
  total_tax: '4.28',
  total_discount: '2.50',
  grand_total: '26.78',
};

const cash = {
  account_id: 1,
  account_code: '1100',
  account_name: 'Cash',
  account_type: AccountType.ASSET,
};
const discounts = {
  account_id: 2,
  account_code: '4900',
  account_name: 'Sales discounts',
  account_type: AccountType.EXPENSE,
};
const revenue = {
  account_id: 3,
  account_code: '4000',
  account_name: 'Sales',
  account_type: AccountType.REVENUE,
};
const taxPayable = {
  account_id: 4,
  account_code: '2100',
  account_name: 'VAT payable',
  account_type: AccountType.LIABILITY,
};

const BALANCED_LINES: LedgerLineInput[] = [
  { ...cash, debit: '26.78', credit: '0.00' },
  { ...discounts, debit: '2.50', credit: '0.00' },
  { ...revenue, debit: '0.00', credit: '25.00' },
  { ...taxPayable, debit: '0.00', credit: '4.28' },
];

describe('billing-financial-sync calculations', () => {
  describe('toCents / fromCents', () => {
    it('converts decimal strings and numbers to integer cents without float drift', () => {
      expect(toCents('26.78')).toBe(2678);
      expect(toCents(0.1 + 0.2)).toBe(30);
      expect(toCents(null)).toBe(0);
      expect(toCents('not-a-number')).toBe(0);
      expect(fromCents(2678)).toBe(26.78);
    });
  });

  describe('postingStatusOf', () => {
    it('is UNPOSTED without entries or with only voided ones', () => {
      expect(postingStatusOf([])).toBe(ReceiptPostingStatus.UNPOSTED);
      expect(postingStatusOf([JournalEntryStatus.VOIDED])).toBe(
        ReceiptPostingStatus.UNPOSTED,
      );
    });

    it('is PENDING while any entry is still DRAFT', () => {
      expect(
        postingStatusOf([JournalEntryStatus.POSTED, JournalEntryStatus.DRAFT]),
      ).toBe(ReceiptPostingStatus.PENDING);
    });

    it('is POSTED when every live entry is posted', () => {
      expect(
        postingStatusOf([JournalEntryStatus.POSTED, JournalEntryStatus.VOIDED]),
      ).toBe(ReceiptPostingStatus.POSTED);
    });
  });

  describe('aggregateByAccount', () => {
    it('sums debit and credit per ledger account and sorts by account code', () => {
      const result = aggregateByAccount([
        { ...revenue, debit: 0, credit: '10.10' },
        { ...cash, debit: '10.10', credit: 0 },
        { ...revenue, debit: 0, credit: '0.20' },
      ]);
      expect(result).toEqual([
        {
          account_id: 1,
          code: '1100',
          name: 'Cash',
          type: AccountType.ASSET,
          debit: 10.1,
          credit: 0,
        },
        {
          account_id: 3,
          code: '4000',
          name: 'Sales',
          type: AccountType.REVENUE,
          debit: 0,
          credit: 10.3,
        },
      ]);
    });
  });

  describe('reconcileReceipt', () => {
    it('associates grand_total with ASSET debits and total_tax with LIABILITY credits (all flags green)', () => {
      const result = reconcileReceipt(
        RECEIPT,
        ['3.00', '1.28'],
        BALANCED_LINES,
      );

      expect(result.ledger_total_debit).toBe(29.28);
      expect(result.ledger_total_credit).toBe(29.28);
      expect(result.asset_net_debit).toBe(26.78);
      expect(result.liability_net_credit).toBe(4.28);
      expect(result.receipt_taxes_total).toBe(4.28);
      expect(result.verification).toEqual({
        receipt_totals_consistent: true,
        receipt_taxes_match_total: true,
        entries_balanced: true,
        grand_total_matches_assets: true,
        tax_matches_liabilities: true,
        is_balanced: true,
      });
    });

    it('flags debits ≠ credits', () => {
      const lines = BALANCED_LINES.map((line) =>
        line.account_id === revenue.account_id
          ? { ...line, credit: '24.99' }
          : line,
      );
      const { verification } = reconcileReceipt(RECEIPT, ['4.28'], lines);
      expect(verification.entries_balanced).toBe(false);
      expect(verification.is_balanced).toBe(false);
    });

    it('flags a grand_total that does not match the net ASSET debit', () => {
      const lines = [
        ...BALANCED_LINES,
        { ...cash, debit: '0.00', credit: '1.00' },
        { ...revenue, debit: '1.00', credit: '0.00' },
      ];
      const { verification, asset_net_debit } = reconcileReceipt(
        RECEIPT,
        ['4.28'],
        lines,
      );
      expect(asset_net_debit).toBe(25.78);
      expect(verification.entries_balanced).toBe(true);
      expect(verification.grand_total_matches_assets).toBe(false);
      expect(verification.is_balanced).toBe(false);
    });

    it('flags a total_tax that does not match the net LIABILITY credit', () => {
      const lines: LedgerLineInput[] = [
        { ...cash, debit: '26.78', credit: 0 },
        { ...discounts, debit: '2.50', credit: 0 },
        { ...revenue, debit: 0, credit: '29.28' },
      ];
      const { verification } = reconcileReceipt(RECEIPT, ['4.28'], lines);
      expect(verification.tax_matches_liabilities).toBe(false);
      expect(verification.is_balanced).toBe(false);
    });

    it('flags receipt totals that do not add up and ReceiptTax records that differ from total_tax', () => {
      const { verification } = reconcileReceipt(
        { ...RECEIPT, grand_total: '26.79' },
        ['4.00'],
        [],
      );
      expect(verification.receipt_totals_consistent).toBe(false);
      expect(verification.receipt_taxes_match_total).toBe(false);
    });

    it('leaves the ledger flags null when there are no entries to verify', () => {
      const { verification } = reconcileReceipt(RECEIPT, ['4.28'], []);
      expect(verification).toEqual({
        receipt_totals_consistent: true,
        receipt_taxes_match_total: true,
        entries_balanced: null,
        grand_total_matches_assets: null,
        tax_matches_liabilities: null,
        is_balanced: null,
      });
    });

    it('compares in cents so 0.1 + 0.2 style sums still balance', () => {
      const { verification } = reconcileReceipt(
        { subtotal: 0.3, total_tax: 0, total_discount: 0, grand_total: 0.3 },
        [],
        [
          { ...cash, debit: 0.1, credit: 0 },
          { ...cash, debit: 0.2, credit: 0 },
          { ...revenue, debit: 0, credit: 0.3 },
        ],
      );
      expect(verification.is_balanced).toBe(true);
    });
  });

  describe('escapeLike', () => {
    it('escapes LIKE wildcards', () => {
      expect(escapeLike('INV_10%\\')).toBe('INV\\_10\\%\\\\');
    });
  });

  describe('verifyLedgerAggregates', () => {
    it('verifies SQL aggregates the same way as journal lines', () => {
      expect(
        verifyLedgerAggregates(RECEIPT, 428, {
          debit: 2928,
          credit: 2928,
          assetNetDebit: 2678,
          liabilityNetCredit: 428,
        }).is_balanced,
      ).toBe(true);
      expect(verifyLedgerAggregates(RECEIPT, 428, null).is_balanced).toBeNull();
    });
  });

  describe('planReceiptPosting', () => {
    const ACCOUNTS = {
      cashAccountId: 1,
      revenueAccountId: 3,
      taxAccountId: 4,
      discountAccountId: 2,
    };

    it('debits ASSET with grand_total and discounts, credits REVENUE with subtotal and LIABILITY with tax', () => {
      const plan = planReceiptPosting(
        { id: 10, invoice_number: 'INV-10', ...RECEIPT },
        ACCOUNTS,
      );
      expect(plan).toEqual({
        ok: true,
        total: 29.28,
        lines: [
          {
            account_id: 1,
            debit: 26.78,
            credit: 0,
            description: 'Receipt INV-10 · amount collected',
          },
          {
            account_id: 2,
            debit: 2.5,
            credit: 0,
            description: 'Receipt INV-10 · discounts granted',
          },
          {
            account_id: 3,
            debit: 0,
            credit: 25,
            description: 'Receipt INV-10 · sales revenue',
          },
          {
            account_id: 4,
            debit: 0,
            credit: 4.28,
            description: 'Receipt INV-10 · tax liability',
          },
        ],
      });
      if (plan.ok) {
        const debit = plan.lines.reduce(
          (sum, l) => sum + Math.round(l.debit * 100),
          0,
        );
        const credit = plan.lines.reduce(
          (sum, l) => sum + Math.round(l.credit * 100),
          0,
        );
        expect(debit).toBe(credit);
      }
    });

    it('omits the tax and discount lines when those totals are zero', () => {
      const plan = planReceiptPosting(
        {
          id: 5,
          subtotal: 10,
          total_tax: 0,
          total_discount: 0,
          grand_total: 10,
        },
        { cashAccountId: 1, revenueAccountId: 3 },
      );
      expect(plan.ok && plan.lines.map((l) => l.account_id)).toEqual([1, 3]);
      expect(plan.ok && plan.lines[0].description).toBe(
        'Receipt #5 · amount collected',
      );
    });

    it.each([
      [{ ...RECEIPT, grand_total: '26.79' }, ACCOUNTS, 'UNBALANCED_TOTALS'],
      [
        { ...RECEIPT, total_discount: '-1.00', grand_total: '30.28' },
        ACCOUNTS,
        'NEGATIVE_AMOUNTS',
      ],
      [
        { subtotal: 0, total_tax: 0, total_discount: 0, grand_total: 0 },
        ACCOUNTS,
        'ZERO_AMOUNT',
      ],
      [RECEIPT, { ...ACCOUNTS, taxAccountId: null }, 'MISSING_TAX_ACCOUNT'],
      [
        RECEIPT,
        { ...ACCOUNTS, discountAccountId: undefined },
        'MISSING_DISCOUNT_ACCOUNT',
      ],
    ])('refuses to post %o (%#)', (totals, accounts, reason) => {
      expect(planReceiptPosting({ id: 1, ...totals }, accounts)).toMatchObject({
        ok: false,
        reason,
      });
    });
  });

  describe('entry numbers and dates', () => {
    it('derives RCPT-<invoice|id> and suffixes it until it is free', () => {
      expect(entryNumberBase({ id: 7, invoice_number: ' INV-7 ' })).toBe(
        'RCPT-INV-7',
      );
      expect(entryNumberBase({ id: 7, invoice_number: null })).toBe('RCPT-7');

      const used = new Set(['RCPT-INV-7', 'RCPT-INV-7-2']);
      expect(pickEntryNumber('RCPT-INV-7', used)).toBe('RCPT-INV-7-3');
      expect(pickEntryNumber('RCPT-INV-7', used)).toBe('RCPT-INV-7-4');
      expect(pickEntryNumber('RCPT-8', used)).toBe('RCPT-8');
    });

    it('keeps the calendar date of the receipt timestamp', () => {
      expect(calendarDate(new Date(2026, 10, 20, 23, 59))).toBe('2026-11-20');
      expect(calendarDate(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
    });
  });
});
