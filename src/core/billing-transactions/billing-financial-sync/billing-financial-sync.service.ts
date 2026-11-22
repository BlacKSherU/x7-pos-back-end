import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { JournalEntry } from 'src/core/financial-engine/journal-entry/entities/journal-entry.entity';
import { JournalEntryReferenceType } from 'src/core/financial-engine/journal-entry/constants/journal-entry-reference-type.enum';
import { JournalEntryStatus } from 'src/core/financial-engine/journal-entry/constants/journal-entry-status.enum';
import { JournalEntryLine } from 'src/core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';
import { LedgerAccount } from 'src/core/financial-engine/ledger-accounts/entities/ledger-account.entity';
import { AccountType } from 'src/core/financial-engine/ledger-accounts/constants/account-type.enum';

import { Receipt } from '../receipts/entities/receipt.entity';
import { ReceiptTax } from '../receipt-tax/entities/receipt-tax.entity';
import { ReceiptPostingStatus } from './constants/posting-status.enum';
import {
  GetFinancialSyncLinesQueryDto,
  GetFinancialSyncQueryDto,
} from './dto/get-financial-sync-query.dto';
import {
  AllPaginatedFinancialSyncRows,
  FinancialSyncJournalEntryDto,
  FinancialSyncLineDto,
  FinancialSyncRowDto,
  OneFinancialSyncLinesResponse,
} from './dto/financial-sync-response.dto';
import {
  FinancialSyncMetricsDto,
  FinancialSyncPostingAccountsResponse,
  FinancialSyncTaxAccountDto,
  LedgerBalanceStatus,
  OneFinancialSyncMetricsResponse,
  PostBatchToLedgerResponse,
  PostedReceiptEntryDto,
  SkippedReceiptDto,
} from './dto/financial-sync-metrics.dto';
import {
  MAX_RECEIPTS_PER_BATCH,
  PostBatchToLedgerDto,
} from './dto/post-batch-to-ledger.dto';
import {
  LedgerLineInput,
  PostingAccountIds,
  aggregateByAccount,
  calendarDate,
  entryNumberBase,
  escapeLike,
  fromCents,
  pickEntryNumber,
  planReceiptPosting,
  postingStatusOf,
  receiptLabel,
  reconcileReceipt,
  toCents,
  verifyLedgerAggregates,
} from './billing-financial-sync.calculations';

/** Parámetros fijos de las condiciones SQL de estado de posteo. */
const POSTING_SQL_PARAMS = {
  receiptRef: JournalEntryReferenceType.RECEIPT,
  postedStatus: JournalEntryStatus.POSTED,
  draftStatus: JournalEntryStatus.DRAFT,
  voidedStatus: JournalEntryStatus.VOIDED,
};

/** EXISTS sobre los asientos activos del recibo `receipt` que cumplen `condition`. */
function linkedEntriesExist(condition: string): string {
  return `EXISTS (SELECT 1 FROM journal_entries je WHERE je.company_id = :companyId AND je.reference_type = :receiptRef AND je.reference_id = receipt.id AND je.is_active = true AND ${condition})`;
}

/** Condición SQL (alias `receipt`) equivalente a `postingStatusOf`. */
export function postingStatusCondition(status: ReceiptPostingStatus): string {
  switch (status) {
    case ReceiptPostingStatus.POSTED:
      return `${linkedEntriesExist('je.status = :postedStatus')} AND NOT ${linkedEntriesExist('je.status = :draftStatus')}`;
    case ReceiptPostingStatus.PENDING:
      return linkedEntriesExist('je.status = :draftStatus');
    case ReceiptPostingStatus.UNPOSTED:
      return `NOT ${linkedEntriesExist('je.status <> :voidedStatus')}`;
  }
}

function lineToLedgerInput(line: JournalEntryLine): LedgerLineInput {
  return {
    account_id: line.account_id,
    account_code: line.account?.code ?? null,
    account_name: line.account?.name ?? null,
    account_type: line.account?.type ?? null,
    debit: line.debit,
    credit: line.credit,
  };
}

function activeLines(entry: JournalEntry): JournalEntryLine[] {
  return (entry.lines ?? []).filter((line) => line.is_active !== false);
}

/** Tipos de cuenta aceptados por cada rol del asiento de venta. */
const POSTING_ACCOUNT_ROLES: Array<{
  field: keyof PostingAccountIds;
  types: AccountType[];
}> = [
  { field: 'cashAccountId', types: [AccountType.ASSET] },
  { field: 'revenueAccountId', types: [AccountType.REVENUE] },
  { field: 'taxAccountId', types: [AccountType.LIABILITY] },
  {
    field: 'discountAccountId',
    types: [AccountType.EXPENSE, AccountType.REVENUE],
  },
];

/** Tipos de cuenta que ofrece el selector del lote (GET posting-accounts). */
const POSTING_ACCOUNT_TYPES = [
  AccountType.ASSET,
  AccountType.REVENUE,
  AccountType.LIABILITY,
  AccountType.EXPENSE,
];

type SqlRunner = Pick<DataSource, 'query'>;

/** Recibos del merchant por estado de posteo + moneda base de la compañía. */
const RECEIPT_COUNTS_SQL = `
  SELECT
    COUNT(*)::int AS total_receipts,
    (COUNT(*) FILTER (WHERE st.has_draft))::int AS pending_receipts,
    (COUNT(*) FILTER (WHERE st.has_posted AND NOT st.has_draft))::int AS posted_receipts,
    (COUNT(*) FILTER (WHERE NOT st.has_posted AND NOT st.has_draft))::int AS unposted_receipts,
    COALESCE(SUM(r.grand_total) FILTER (WHERE st.has_posted AND NOT st.has_draft), 0) AS posted_grand_total,
    (SELECT c.base_currency FROM company c WHERE c.id = $2) AS currency
  FROM receipts r
  CROSS JOIN LATERAL (
    SELECT COALESCE(bool_or(je.status = $3), false) AS has_posted,
           COALESCE(bool_or(je.status = $4), false) AS has_draft
    FROM journal_entries je
    WHERE je.company_id = $2 AND je.reference_type = $5
      AND je.reference_id = r.id AND je.is_active = true
  ) st
  WHERE r.merchant_id = $1 AND r.is_active = true`;

/** Asientos enlazados a recibos del merchant e ingreso neto posteado en cuentas REVENUE. */
const RECEIPT_ENTRIES_SQL = `
  SELECT
    (COUNT(DISTINCT je.id) FILTER (WHERE je.status = $3))::int AS posted_entries,
    (COUNT(DISTINCT je.id) FILTER (WHERE je.status = $4))::int AS pending_entries,
    COALESCE(SUM(l.credit - l.debit) FILTER (WHERE je.status = $3 AND a.type = $6), 0) AS posted_revenue
  FROM journal_entries je
  JOIN receipts r ON r.id = je.reference_id AND r.merchant_id = $1 AND r.is_active = true
  LEFT JOIN journal_entry_lines l ON l.journal_entry_id = je.id AND l.is_active = true
  LEFT JOIN ledger_accounts a ON a.id = l.account_id
  WHERE je.company_id = $2 AND je.reference_type = $5 AND je.is_active = true`;

/**
 * Cuentas LIABILITY usadas por los asientos de recibos del merchant, con su saldo
 * (crédito − débito) sobre todos los asientos POSTED de la compañía.
 */
const TAX_ACCOUNT_BALANCES_SQL = `
  SELECT a.id AS account_id, a.code, a.name,
    COALESCE(SUM(bl.credit - bl.debit) FILTER (WHERE bje.id IS NOT NULL), 0) AS balance
  FROM ledger_accounts a
  LEFT JOIN journal_entry_lines bl ON bl.account_id = a.id AND bl.is_active = true
  LEFT JOIN journal_entries bje ON bje.id = bl.journal_entry_id AND bje.company_id = $2
    AND bje.is_active = true AND bje.status = $3
  WHERE a.company_id = $2 AND a.type = $4 AND a.id IN (
    SELECT l.account_id
    FROM journal_entry_lines l
    JOIN journal_entries je ON je.id = l.journal_entry_id
    JOIN receipts r ON r.id = je.reference_id AND r.merchant_id = $1 AND r.is_active = true
    WHERE je.company_id = $2 AND je.reference_type = $5 AND je.is_active = true
      AND je.status <> $6 AND l.is_active = true
  )
  GROUP BY a.id, a.code, a.name
  ORDER BY a.code`;

/** Agregados del libro mayor por recibo (asientos no anulados) para el estado global de balance. */
const RECEIPT_LEDGER_AGGREGATES_SQL = `
  SELECT r.id AS receipt_id, r.subtotal, r.total_tax, r.total_discount, r.grand_total,
    COALESCE((SELECT SUM(t.amount) FROM receipt_taxes t WHERE t.receipt_id = r.id AND t.is_active = true), 0) AS tax_records,
    COALESCE(SUM(l.debit), 0) AS debit,
    COALESCE(SUM(l.credit), 0) AS credit,
    COALESCE(SUM(l.debit - l.credit) FILTER (WHERE a.type = $5), 0) AS asset_net_debit,
    COALESCE(SUM(l.credit - l.debit) FILTER (WHERE a.type = $6), 0) AS liability_net_credit
  FROM receipts r
  JOIN journal_entries je ON je.reference_id = r.id AND je.company_id = $2
    AND je.reference_type = $3 AND je.is_active = true AND je.status <> $4
  JOIN journal_entry_lines l ON l.journal_entry_id = je.id AND l.is_active = true
  JOIN ledger_accounts a ON a.id = l.account_id
  WHERE r.merchant_id = $1 AND r.is_active = true
  GROUP BY r.id`;

interface ReceiptCountsRow {
  total_receipts: number | string;
  pending_receipts: number | string;
  posted_receipts: number | string;
  unposted_receipts: number | string;
  posted_grand_total: number | string;
  currency: string | null;
}

interface ReceiptEntriesRow {
  posted_entries: number | string;
  pending_entries: number | string;
  posted_revenue: number | string;
}

interface TaxAccountRow {
  account_id: number;
  code: string;
  name: string;
  balance: number | string;
}

interface ReceiptLedgerRow {
  receipt_id: number;
  subtotal: string;
  total_tax: string;
  total_discount: string;
  grand_total: string;
  tax_records: string;
  debit: string;
  credit: string;
  asset_net_debit: string;
  liability_net_credit: string;
}

@Injectable()
export class BillingFinancialSyncService {
  constructor(
    @InjectRepository(Receipt)
    private readonly receiptRepo: Repository<Receipt>,
    @InjectRepository(ReceiptTax)
    private readonly receiptTaxRepo: Repository<ReceiptTax>,
    @InjectRepository(JournalEntry)
    private readonly journalEntryRepo: Repository<JournalEntry>,
    @InjectRepository(Merchant)
    private readonly merchantRepo: Repository<Merchant>,
    @InjectRepository(LedgerAccount)
    private readonly ledgerAccountRepo: Repository<LedgerAccount>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Compañía dueña del merchant: los asientos y cuentas contables se aíslan por compañía. */
  private async getCompanyId(merchantId: number): Promise<number> {
    if (!merchantId) {
      ErrorHandler.forbidden('You must be associated with a merchant');
    }
    const merchant = await this.merchantRepo.findOne({
      where: { id: merchantId },
      select: ['id', 'companyId'],
    });
    if (!merchant) ErrorHandler.notFound(ErrorMessage.MERCHANT_NOT_FOUND);
    if (!merchant.companyId) {
      ErrorHandler.forbidden('Merchant is not associated with a company');
    }
    return merchant.companyId;
  }

  /** Asientos activos (cualquier estado) enlazados a los recibos, con líneas y cuentas. */
  private findLinkedEntries(
    companyId: number,
    receiptIds: number[],
    journalEntryId?: number,
  ): Promise<JournalEntry[]> {
    return this.journalEntryRepo.find({
      where: {
        company_id: companyId,
        reference_type: JournalEntryReferenceType.RECEIPT,
        reference_id: In(receiptIds),
        is_active: true,
        ...(journalEntryId ? { id: journalEntryId } : {}),
      },
      relations: { lines: { account: true } },
      order: { entry_date: 'ASC', id: 'ASC' },
    });
  }

  private toEntryDto(entry: JournalEntry): FinancialSyncJournalEntryDto {
    const lines = activeLines(entry);
    const debit = lines.reduce((sum, line) => sum + toCents(line.debit), 0);
    const credit = lines.reduce((sum, line) => sum + toCents(line.credit), 0);
    return {
      id: entry.id,
      entry_number: entry.entry_number,
      entry_date: entry.entry_date,
      status: entry.status,
      total_debit: Number(entry.total_debit),
      total_credit: Number(entry.total_credit),
      is_balanced: debit === credit,
      line_count: lines.length,
    };
  }

  /** Fila del grid: recibo + impuestos + asientos + cuentas + banderas de balance. */
  buildRow(
    receipt: Receipt,
    taxes: ReceiptTax[],
    entries: JournalEntry[],
  ): FinancialSyncRowDto {
    const liveEntries = entries.filter(
      (entry) => entry.status !== JournalEntryStatus.VOIDED,
    );
    const ledgerLines = liveEntries.flatMap((entry) =>
      activeLines(entry).map(lineToLedgerInput),
    );
    const accounts = aggregateByAccount(ledgerLines);
    const reconciliation = reconcileReceipt(
      receipt,
      taxes.map((tax) => tax.amount),
      ledgerLines,
    );

    return {
      receipt_id: receipt.id,
      invoice_number: receipt.invoice_number ?? null,
      type: receipt.type,
      currency: receipt.currency,
      is_locked: Boolean(receipt.is_locked),
      created_at: receipt.created_at,
      subtotal: Number(receipt.subtotal),
      total_tax: Number(receipt.total_tax),
      total_discount: Number(receipt.total_discount),
      grand_total: Number(receipt.grand_total),
      posting_status: postingStatusOf(entries.map((entry) => entry.status)),
      receipt_taxes: taxes.map((tax) => ({
        id: tax.id,
        name: tax.name,
        rate: Number(tax.rate),
        amount: Number(tax.amount),
        scope: tax.scope,
        receipt_item_id: tax.receipt_item_id ?? null,
      })),
      journal_entries: entries.map((entry) => this.toEntryDto(entry)),
      ledger_account_ids: accounts.map((account) => account.account_id),
      ledger_accounts: accounts,
      ...reconciliation,
    };
  }

  // ─── Historia 1: grid de sincronización ───────────────────────────────────

  async findAll(
    query: GetFinancialSyncQueryDto,
    merchantId: number,
  ): Promise<AllPaginatedFinancialSyncRows> {
    const companyId = await this.getCompanyId(merchantId);
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      ErrorHandler.badRequest('dateFrom must be on or before dateTo');
    }

    const qb = this.receiptRepo
      .createQueryBuilder('receipt')
      .where('receipt.merchant_id = :merchantId', { merchantId })
      .andWhere('receipt.is_active = true');

    const search = query.search?.trim();
    if (search) {
      qb.andWhere('receipt.invoice_number ILIKE :search', {
        search: `%${escapeLike(search)}%`,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('receipt.created_at >= CAST(:dateFrom AS date)', {
        dateFrom: query.dateFrom,
      });
    }
    if (query.dateTo) {
      qb.andWhere(
        `receipt.created_at < CAST(:dateTo AS date) + INTERVAL '1 day'`,
        { dateTo: query.dateTo },
      );
    }
    if (query.postingStatus) {
      qb.andWhere(postingStatusCondition(query.postingStatus), {
        companyId,
        ...POSTING_SQL_PARAMS,
      });
    }

    const [receipts, total] = await qb
      .orderBy('receipt.created_at', 'DESC')
      .addOrderBy('receipt.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const ids = receipts.map((receipt) => receipt.id);
    const [taxes, entries] =
      ids.length > 0
        ? await Promise.all([
            this.receiptTaxRepo.find({
              where: { receipt_id: In(ids), is_active: true },
              order: { id: 'ASC' },
            }),
            this.findLinkedEntries(companyId, ids),
          ])
        : [[], []];

    const data = receipts.map((receipt) =>
      this.buildRow(
        receipt,
        taxes.filter((tax) => tax.receipt_id === receipt.id),
        entries.filter((entry) => entry.reference_id === receipt.id),
      ),
    );

    const totalPages = Math.ceil(total / limit);
    return {
      statusCode: 200,
      message: 'Financial sync rows retrieved successfully',
      data,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  /**
   * Drill-down: líneas de los asientos del recibo (o de uno de ellos) con su cuenta.
   * Los totales suman el asiento pedido o, sin `journalEntryId`, los asientos no anulados.
   */
  async findLines(
    receiptId: number,
    query: GetFinancialSyncLinesQueryDto,
    merchantId: number,
  ): Promise<OneFinancialSyncLinesResponse> {
    const companyId = await this.getCompanyId(merchantId);

    const receipt = await this.receiptRepo.findOne({
      where: { id: receiptId, merchant_id: merchantId, is_active: true },
    });
    if (!receipt) ErrorHandler.notFound('Receipt not found');

    const entries = await this.findLinkedEntries(
      companyId,
      [receiptId],
      query.journalEntryId,
    );
    if (query.journalEntryId && entries.length === 0) {
      ErrorHandler.notFound(
        `Journal entry ${query.journalEntryId} is not linked to receipt ${receiptId}`,
      );
    }

    const lines: FinancialSyncLineDto[] = [];
    let debit = 0;
    let credit = 0;
    for (const entry of entries) {
      const countsInTotals =
        Boolean(query.journalEntryId) ||
        entry.status !== JournalEntryStatus.VOIDED;
      for (const line of activeLines(entry)) {
        lines.push({
          id: line.id,
          journal_entry_id: entry.id,
          entry_number: entry.entry_number,
          entry_status: entry.status,
          account: line.account
            ? {
                id: line.account.id,
                code: line.account.code,
                name: line.account.name,
                type: line.account.type,
              }
            : null,
          debit: Number(line.debit),
          credit: Number(line.credit),
          description: line.description ?? null,
        });
        if (countsInTotals) {
          debit += toCents(line.debit);
          credit += toCents(line.credit);
        }
      }
    }

    return {
      statusCode: 200,
      message: 'Journal entry lines retrieved successfully',
      data: {
        receipt_id: receipt.id,
        invoice_number: receipt.invoice_number ?? null,
        currency: receipt.currency,
        journal_entry_id: query.journalEntryId ?? null,
        lines,
        total_debit: fromCents(debit),
        total_credit: fromCents(credit),
        is_balanced: debit === credit,
      },
    };
  }

  // ─── Historia 2: métricas del header y POST BATCH TO LEDGER ───────────────

  async getMetrics(
    merchantId: number,
  ): Promise<OneFinancialSyncMetricsResponse> {
    const companyId = await this.getCompanyId(merchantId);
    return {
      statusCode: 200,
      message: 'Ledger posting metrics retrieved successfully',
      data: await this.computeMetrics(merchantId, companyId, this.dataSource),
    };
  }

  /** KPIs del header: recibos/ingresos posteados, pendientes, impuestos y balance global. */
  private async computeMetrics(
    merchantId: number,
    companyId: number,
    runner: SqlRunner,
  ): Promise<FinancialSyncMetricsDto> {
    const [receiptRows, entryRows, taxRows, ledgerRows] = (await Promise.all([
      runner.query(RECEIPT_COUNTS_SQL, [
        merchantId,
        companyId,
        JournalEntryStatus.POSTED,
        JournalEntryStatus.DRAFT,
        JournalEntryReferenceType.RECEIPT,
      ]),
      runner.query(RECEIPT_ENTRIES_SQL, [
        merchantId,
        companyId,
        JournalEntryStatus.POSTED,
        JournalEntryStatus.DRAFT,
        JournalEntryReferenceType.RECEIPT,
        AccountType.REVENUE,
      ]),
      runner.query(TAX_ACCOUNT_BALANCES_SQL, [
        merchantId,
        companyId,
        JournalEntryStatus.POSTED,
        AccountType.LIABILITY,
        JournalEntryReferenceType.RECEIPT,
        JournalEntryStatus.VOIDED,
      ]),
      runner.query(RECEIPT_LEDGER_AGGREGATES_SQL, [
        merchantId,
        companyId,
        JournalEntryReferenceType.RECEIPT,
        JournalEntryStatus.VOIDED,
        AccountType.ASSET,
        AccountType.LIABILITY,
      ]),
    ])) as [
      ReceiptCountsRow[],
      ReceiptEntriesRow[],
      TaxAccountRow[],
      ReceiptLedgerRow[],
    ];

    const receipts = receiptRows[0];
    const entries = entryRows[0];
    const posted = Number(receipts?.posted_receipts ?? 0);
    const pending = Number(receipts?.pending_receipts ?? 0);
    const unposted = Number(receipts?.unposted_receipts ?? 0);

    const taxAccounts: FinancialSyncTaxAccountDto[] = taxRows.map((row) => ({
      account_id: Number(row.account_id),
      code: row.code,
      name: row.name,
      balance: fromCents(toCents(row.balance)),
    }));

    const balancedReceipts = ledgerRows.filter(
      (row) =>
        verifyLedgerAggregates(row, toCents(row.tax_records), {
          debit: toCents(row.debit),
          credit: toCents(row.credit),
          assetNetDebit: toCents(row.asset_net_debit),
          liabilityNetCredit: toCents(row.liability_net_credit),
        }).is_balanced === true,
    ).length;
    const unbalancedReceipts = ledgerRows.length - balancedReceipts;
    const status: LedgerBalanceStatus =
      ledgerRows.length === 0
        ? 'NO_ENTRIES'
        : unbalancedReceipts > 0
          ? 'UNBALANCED'
          : 'BALANCED';

    return {
      currency: receipts?.currency || 'USD',
      total_receipts: Number(receipts?.total_receipts ?? 0),
      posted_receipts: posted,
      pending_receipts: pending,
      unposted_receipts: unposted,
      unposted_transactions: unposted + pending,
      pending_ledger_entries: Number(entries?.pending_entries ?? 0),
      posted_ledger_entries: Number(entries?.posted_entries ?? 0),
      posted_revenue: fromCents(toCents(entries?.posted_revenue)),
      posted_grand_total: fromCents(toCents(receipts?.posted_grand_total)),
      tax_accounts: taxAccounts,
      tax_liability_balance: fromCents(
        taxAccounts.reduce((sum, account) => sum + toCents(account.balance), 0),
      ),
      balance: {
        status,
        checked_receipts: ledgerRows.length,
        balanced_receipts: balancedReceipts,
        unbalanced_receipts: unbalancedReceipts,
      },
    };
  }

  /** Cuentas activas de la compañía que puede usar el lote (ASSET, REVENUE, LIABILITY, EXPENSE). */
  async getPostingAccounts(
    merchantId: number,
  ): Promise<FinancialSyncPostingAccountsResponse> {
    const companyId = await this.getCompanyId(merchantId);
    const accounts = await this.ledgerAccountRepo.find({
      where: {
        company_id: companyId,
        is_active: true,
        type: In(POSTING_ACCOUNT_TYPES),
      },
      order: { code: 'ASC' },
    });
    return {
      statusCode: 200,
      message: 'Posting accounts retrieved successfully',
      data: accounts.map((account) => ({
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
      })),
    };
  }

  /** Valida que cada cuenta elegida exista, esté activa, sea de la compañía y del tipo correcto. */
  private async resolvePostingAccounts(
    companyId: number,
    dto: PostBatchToLedgerDto,
  ): Promise<PostingAccountIds> {
    const requested = POSTING_ACCOUNT_ROLES.filter((role) => dto[role.field]);
    const found = await this.ledgerAccountRepo.find({
      where: {
        id: In(requested.map((role) => dto[role.field] as number)),
        company_id: companyId,
        is_active: true,
      },
    });
    for (const role of requested) {
      const id = dto[role.field] as number;
      const account = found.find((candidate) => candidate.id === id);
      if (!account) {
        ErrorHandler.notFound(
          `Ledger account ${id} (${role.field}) not found or inactive`,
        );
      }
      if (!role.types.includes(account.type)) {
        ErrorHandler.badRequest(
          `${role.field} must be a ${role.types.join(' or ')} account; ledger account ${account.code} is ${account.type}`,
        );
      }
    }
    return {
      cashAccountId: dto.cashAccountId,
      revenueAccountId: dto.revenueAccountId,
      taxAccountId: dto.taxAccountId ?? null,
      discountAccountId: dto.discountAccountId ?? null,
    };
  }

  /** Números de asiento ya usados en la compañía que chocan con las bases del lote. */
  private async usedEntryNumbers(
    manager: EntityManager,
    companyId: number,
    bases: string[],
  ): Promise<Set<string>> {
    const rows = await manager
      .getRepository(JournalEntry)
      .createQueryBuilder('je')
      .select('je.entry_number', 'entry_number')
      .where('je.company_id = :companyId', { companyId })
      .andWhere(
        '(je.entry_number IN (:...bases) OR je.entry_number LIKE ANY(ARRAY[:...patterns]))',
        { bases, patterns: bases.map((base) => `${escapeLike(base)}-%`) },
      )
      .getRawMany<{ entry_number: string }>();
    return new Set(rows.map((row) => row.entry_number));
  }

  /**
   * POST BATCH TO LEDGER: en una transacción, genera y postea el asiento de venta de cada
   * recibo sin asientos y postea los DRAFT cuadrados de los recibos pendientes. Bloquea
   * los recibos (FOR UPDATE) y vuelve a mirar sus asientos, así que un recibo nunca se
   * postea dos veces. Devuelve las métricas ya recalculadas para el header.
   */
  async postBatch(
    dto: PostBatchToLedgerDto,
    merchantId: number,
  ): Promise<PostBatchToLedgerResponse> {
    const companyId = await this.getCompanyId(merchantId);
    const accounts = await this.resolvePostingAccounts(companyId, dto);

    const { entries, skipped } = await this.dataSource.transaction(
      async (manager) => {
        const entryRepo = manager.getRepository(JournalEntry);
        const qb = manager
          .getRepository(Receipt)
          .createQueryBuilder('receipt')
          .setLock('pessimistic_write')
          .where('receipt.merchant_id = :merchantId', { merchantId })
          .andWhere('receipt.is_active = true');
        if (dto.receiptIds?.length) {
          qb.andWhere('receipt.id IN (:...receiptIds)', {
            receiptIds: dto.receiptIds,
          });
        } else {
          qb.andWhere(
            `NOT (${postingStatusCondition(ReceiptPostingStatus.POSTED)})`,
            { companyId, ...POSTING_SQL_PARAMS },
          );
        }
        const receipts = await qb
          .orderBy('receipt.created_at', 'ASC')
          .addOrderBy('receipt.id', 'ASC')
          .limit(MAX_RECEIPTS_PER_BATCH)
          .getMany();

        const skipped: SkippedReceiptDto[] = (dto.receiptIds ?? [])
          .filter((id) => !receipts.some((receipt) => receipt.id === id))
          .map((id) => ({
            receipt_id: id,
            invoice_number: null,
            reason: 'NOT_FOUND' as const,
            detail: `Receipt ${id} not found for this merchant`,
          }));
        const entries: PostedReceiptEntryDto[] = [];
        if (receipts.length === 0) return { entries, skipped };

        const linked = await entryRepo.find({
          where: {
            company_id: companyId,
            reference_type: JournalEntryReferenceType.RECEIPT,
            reference_id: In(receipts.map((receipt) => receipt.id)),
            is_active: true,
          },
          relations: { lines: true },
          order: { id: 'ASC' },
        });
        const used = await this.usedEntryNumbers(
          manager,
          companyId,
          receipts.map((receipt) => entryNumberBase(receipt)),
        );

        for (const receipt of receipts) {
          const live = linked.filter(
            (entry) =>
              entry.reference_id === receipt.id &&
              entry.status !== JournalEntryStatus.VOIDED,
          );
          const skip = (reason: SkippedReceiptDto['reason'], detail: string) =>
            skipped.push({
              receipt_id: receipt.id,
              invoice_number: receipt.invoice_number ?? null,
              reason,
              detail,
            });

          if (live.length === 0) {
            const plan = planReceiptPosting(receipt, accounts);
            if (!plan.ok) {
              skip(plan.reason, plan.detail);
              continue;
            }
            const saved = await entryRepo.save(
              entryRepo.create({
                company_id: companyId,
                entry_number: pickEntryNumber(entryNumberBase(receipt), used),
                entry_date: calendarDate(receipt.created_at) as unknown as Date,
                description: `Sales receipt ${receiptLabel(receipt)} posted from Billing`,
                status: JournalEntryStatus.POSTED,
                total_debit: plan.total,
                total_credit: plan.total,
                reference_type: JournalEntryReferenceType.RECEIPT,
                reference_id: receipt.id,
                lines: plan.lines.map((line) =>
                  manager.getRepository(JournalEntryLine).create(line),
                ),
              }),
            );
            entries.push({
              id: saved.id,
              entry_number: saved.entry_number,
              receipt_id: receipt.id,
              status: JournalEntryStatus.POSTED,
              total_debit: plan.total,
              total_credit: plan.total,
              generated: true,
            });
            continue;
          }

          const drafts = live.filter(
            (entry) => entry.status === JournalEntryStatus.DRAFT,
          );
          if (drafts.length === 0) {
            skip(
              'ALREADY_POSTED',
              `Receipt ${receiptLabel(receipt)} is already posted`,
            );
            continue;
          }
          for (const draft of drafts) {
            const lines = activeLines(draft);
            const debit = lines.reduce((sum, l) => sum + toCents(l.debit), 0);
            const credit = lines.reduce((sum, l) => sum + toCents(l.credit), 0);
            if (debit === 0 || debit !== credit) {
              skip(
                'UNBALANCED_DRAFT',
                `Draft entry ${draft.entry_number} of receipt ${receiptLabel(receipt)} is not balanced`,
              );
              continue;
            }
            await entryRepo.update(
              { id: draft.id },
              { status: JournalEntryStatus.POSTED },
            );
            entries.push({
              id: draft.id,
              entry_number: draft.entry_number,
              receipt_id: receipt.id,
              status: JournalEntryStatus.POSTED,
              total_debit: fromCents(debit),
              total_credit: fromCents(credit),
              generated: false,
            });
          }
        }
        return { entries, skipped };
      },
    );

    const generated = entries.filter((entry) => entry.generated).length;
    const postedDrafts = entries.length - generated;
    return {
      statusCode: 201,
      message:
        entries.length > 0
          ? `Posted ${entries.length} journal entr${entries.length === 1 ? 'y' : 'ies'} to the ledger`
          : 'No receipts were posted to the ledger',
      data: {
        generated_entries: generated,
        posted_drafts: postedDrafts,
        entries,
        skipped,
        metrics: await this.computeMetrics(
          merchantId,
          companyId,
          this.dataSource,
        ),
      },
    };
  }
}
