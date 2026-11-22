import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ErrorHandler } from 'src/common/utils/error-handler.util';
import { ErrorMessage } from 'src/common/constants/error-messages';
import { Merchant } from 'src/platform-saas/merchants/entities/merchant.entity';
import { JournalEntry } from 'src/core/financial-engine/journal-entry/entities/journal-entry.entity';
import { JournalEntryReferenceType } from 'src/core/financial-engine/journal-entry/constants/journal-entry-reference-type.enum';
import { JournalEntryStatus } from 'src/core/financial-engine/journal-entry/constants/journal-entry-status.enum';
import { JournalEntryLine } from 'src/core/financial-engine/journal-entry-line/entities/journal-entry-line.entity';

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
  LedgerLineInput,
  aggregateByAccount,
  escapeLike,
  fromCents,
  postingStatusOf,
  reconcileReceipt,
  toCents,
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
}
