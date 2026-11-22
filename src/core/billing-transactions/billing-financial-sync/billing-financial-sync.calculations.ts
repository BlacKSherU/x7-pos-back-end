import { AccountType } from 'src/core/financial-engine/ledger-accounts/constants/account-type.enum';
import { JournalEntryStatus } from 'src/core/financial-engine/journal-entry/constants/journal-entry-status.enum';

import { ReceiptPostingStatus } from './constants/posting-status.enum';

/**
 * Cálculos puros del cruce Billing ↔ Ledger. Todo el dinero se compara en centavos
 * enteros para no arrastrar errores de coma flotante (las columnas son decimal(12,2) y
 * decimal(15,2), que el driver devuelve como string).
 */

export function toCents(value: number | string | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Estado de posteo de un recibo a partir de los estados de sus asientos enlazados. */
export function postingStatusOf(
  statuses: readonly JournalEntryStatus[],
): ReceiptPostingStatus {
  if (statuses.includes(JournalEntryStatus.DRAFT)) {
    return ReceiptPostingStatus.PENDING;
  }
  if (statuses.includes(JournalEntryStatus.POSTED)) {
    return ReceiptPostingStatus.POSTED;
  }
  return ReceiptPostingStatus.UNPOSTED;
}

export interface ReceiptTotalsInput {
  subtotal: number | string;
  total_tax: number | string;
  total_discount: number | string;
  grand_total: number | string;
}

export interface LedgerLineInput {
  account_id: number;
  account_code?: string | null;
  account_name?: string | null;
  account_type?: AccountType | null;
  debit: number | string;
  credit: number | string;
}

export interface LedgerAccountMovement {
  account_id: number;
  code: string | null;
  name: string | null;
  type: AccountType | null;
  debit: number;
  credit: number;
}

/** Débitos y créditos agregados por cuenta contable (orden: código, luego id). */
export function aggregateByAccount(
  lines: readonly LedgerLineInput[],
): LedgerAccountMovement[] {
  const byAccount = new Map<
    number,
    { line: LedgerLineInput; debit: number; credit: number }
  >();
  for (const line of lines) {
    const current = byAccount.get(line.account_id) ?? {
      line,
      debit: 0,
      credit: 0,
    };
    current.debit += toCents(line.debit);
    current.credit += toCents(line.credit);
    byAccount.set(line.account_id, current);
  }

  return [...byAccount.entries()]
    .map(([accountId, { line, debit, credit }]) => ({
      account_id: accountId,
      code: line.account_code ?? null,
      name: line.account_name ?? null,
      type: line.account_type ?? null,
      debit: fromCents(debit),
      credit: fromCents(credit),
    }))
    .sort(
      (a, b) =>
        (a.code ?? '').localeCompare(b.code ?? '', undefined, {
          numeric: true,
        }) || a.account_id - b.account_id,
    );
}

export interface BalanceVerification {
  /** subtotal + total_tax − total_discount == grand_total */
  receipt_totals_consistent: boolean;
  /** Σ ReceiptTax activos == total_tax */
  receipt_taxes_match_total: boolean;
  /** Σ débitos == Σ créditos en los asientos no anulados (null sin asientos). */
  entries_balanced: boolean | null;
  /** grand_total == débito neto en cuentas ASSET (null sin asientos). */
  grand_total_matches_assets: boolean | null;
  /** total_tax == crédito neto en cuentas LIABILITY (null sin asientos). */
  tax_matches_liabilities: boolean | null;
  /** Todas las banderas anteriores en verde; null si no hay asientos que verificar. */
  is_balanced: boolean | null;
}

export interface LedgerReconciliation {
  ledger_total_debit: number;
  ledger_total_credit: number;
  asset_net_debit: number;
  liability_net_credit: number;
  receipt_taxes_total: number;
  verification: BalanceVerification;
}

/** Agregados del libro mayor de un recibo, en centavos. */
export interface LedgerAggregatesCents {
  debit: number;
  credit: number;
  assetNetDebit: number;
  liabilityNetCredit: number;
}

/**
 * Banderas de balance a partir de los totales del recibo, la suma de sus ReceiptTax
 * activos y los agregados de sus asientos no anulados (null si no hay asientos).
 */
export function verifyLedgerAggregates(
  receipt: ReceiptTotalsInput,
  taxRecordsCents: number,
  ledger: LedgerAggregatesCents | null,
): BalanceVerification {
  const subtotal = toCents(receipt.subtotal);
  const tax = toCents(receipt.total_tax);
  const discount = toCents(receipt.total_discount);
  const grandTotal = toCents(receipt.grand_total);

  const receiptTotalsConsistent = subtotal + tax - discount === grandTotal;
  const receiptTaxesMatchTotal = taxRecordsCents === tax;
  const entriesBalanced = ledger ? ledger.debit === ledger.credit : null;
  const grandTotalMatchesAssets = ledger
    ? ledger.assetNetDebit === grandTotal
    : null;
  const taxMatchesLiabilities = ledger
    ? ledger.liabilityNetCredit === tax
    : null;

  return {
    receipt_totals_consistent: receiptTotalsConsistent,
    receipt_taxes_match_total: receiptTaxesMatchTotal,
    entries_balanced: entriesBalanced,
    grand_total_matches_assets: grandTotalMatchesAssets,
    tax_matches_liabilities: taxMatchesLiabilities,
    is_balanced: ledger
      ? receiptTotalsConsistent &&
        receiptTaxesMatchTotal &&
        entriesBalanced === true &&
        grandTotalMatchesAssets === true &&
        taxMatchesLiabilities === true
      : null,
  };
}

/**
 * Cruza los totales del recibo con sus impuestos y con las líneas de sus asientos
 * no anulados. `ledgerLines` vacío ⇒ las banderas del libro mayor quedan en null.
 */
export function reconcileReceipt(
  receipt: ReceiptTotalsInput,
  activeTaxAmounts: readonly (number | string)[],
  ledgerLines: readonly LedgerLineInput[],
): LedgerReconciliation {
  const taxRecords = activeTaxAmounts.reduce<number>(
    (sum, amount) => sum + toCents(amount),
    0,
  );

  const ledger: LedgerAggregatesCents = {
    debit: 0,
    credit: 0,
    assetNetDebit: 0,
    liabilityNetCredit: 0,
  };
  for (const line of ledgerLines) {
    const lineDebit = toCents(line.debit);
    const lineCredit = toCents(line.credit);
    ledger.debit += lineDebit;
    ledger.credit += lineCredit;
    if (line.account_type === AccountType.ASSET) {
      ledger.assetNetDebit += lineDebit - lineCredit;
    } else if (line.account_type === AccountType.LIABILITY) {
      ledger.liabilityNetCredit += lineCredit - lineDebit;
    }
  }

  return {
    ledger_total_debit: fromCents(ledger.debit),
    ledger_total_credit: fromCents(ledger.credit),
    asset_net_debit: fromCents(ledger.assetNetDebit),
    liability_net_credit: fromCents(ledger.liabilityNetCredit),
    receipt_taxes_total: fromCents(taxRecords),
    verification: verifyLedgerAggregates(
      receipt,
      taxRecords,
      ledgerLines.length > 0 ? ledger : null,
    ),
  };
}

// ─── Posteo por lotes ───────────────────────────────────────────────────────

/** Cuentas contables elegidas para generar los asientos de los recibos. */
export interface PostingAccountIds {
  cashAccountId: number;
  revenueAccountId: number;
  taxAccountId?: number | null;
  discountAccountId?: number | null;
}

export type PostingSkipReason =
  | 'NOT_FOUND'
  | 'ALREADY_POSTED'
  | 'UNBALANCED_DRAFT'
  | 'ZERO_AMOUNT'
  | 'NEGATIVE_AMOUNTS'
  | 'UNBALANCED_TOTALS'
  | 'MISSING_TAX_ACCOUNT'
  | 'MISSING_DISCOUNT_ACCOUNT';

export interface PlannedPostingLine {
  account_id: number;
  debit: number;
  credit: number;
  description: string;
}

export type ReceiptPostingPlan =
  | { ok: true; lines: PlannedPostingLine[]; total: number }
  | { ok: false; reason: PostingSkipReason; detail: string };

export interface PostableReceipt extends ReceiptTotalsInput {
  id: number;
  invoice_number?: string | null;
}

export function receiptLabel(receipt: {
  id: number;
  invoice_number?: string | null;
}): string {
  return receipt.invoice_number?.trim() || `#${receipt.id}`;
}

/**
 * Asiento de venta de un recibo (partida doble, en centavos):
 *   Dr ASSET     grand_total
 *   Dr descuento total_discount   (si > 0)
 *   Cr REVENUE   subtotal
 *   Cr LIABILITY total_tax        (si > 0)
 * Cuadra porque grand_total = subtotal + total_tax − total_discount; si los totales del
 * recibo no cumplen esa igualdad, no se postea.
 */
export function planReceiptPosting(
  receipt: PostableReceipt,
  accounts: PostingAccountIds,
): ReceiptPostingPlan {
  const subtotal = toCents(receipt.subtotal);
  const tax = toCents(receipt.total_tax);
  const discount = toCents(receipt.total_discount);
  const grandTotal = toCents(receipt.grand_total);
  const label = receiptLabel(receipt);

  if ([subtotal, tax, discount, grandTotal].some((cents) => cents < 0)) {
    return {
      ok: false,
      reason: 'NEGATIVE_AMOUNTS',
      detail: `Receipt ${label} has negative totals`,
    };
  }
  if (subtotal === 0 && grandTotal === 0) {
    return {
      ok: false,
      reason: 'ZERO_AMOUNT',
      detail: `Receipt ${label} has no amounts to post`,
    };
  }
  if (subtotal + tax - discount !== grandTotal) {
    return {
      ok: false,
      reason: 'UNBALANCED_TOTALS',
      detail: `Receipt ${label}: subtotal + tax − discount ≠ grand total`,
    };
  }
  if (tax > 0 && !accounts.taxAccountId) {
    return {
      ok: false,
      reason: 'MISSING_TAX_ACCOUNT',
      detail: `Receipt ${label} carries tax but no tax liability account was selected`,
    };
  }
  if (discount > 0 && !accounts.discountAccountId) {
    return {
      ok: false,
      reason: 'MISSING_DISCOUNT_ACCOUNT',
      detail: `Receipt ${label} carries a discount but no discount account was selected`,
    };
  }

  const lines: PlannedPostingLine[] = [];
  const add = (
    accountId: number | null | undefined,
    debit: number,
    credit: number,
    what: string,
  ) => {
    if (!accountId || (debit === 0 && credit === 0)) return;
    lines.push({
      account_id: accountId,
      debit: fromCents(debit),
      credit: fromCents(credit),
      description: `Receipt ${label} · ${what}`,
    });
  };
  add(accounts.cashAccountId, grandTotal, 0, 'amount collected');
  add(accounts.discountAccountId, discount, 0, 'discounts granted');
  add(accounts.revenueAccountId, 0, subtotal, 'sales revenue');
  add(accounts.taxAccountId, 0, tax, 'tax liability');

  return { ok: true, lines, total: fromCents(grandTotal + discount) };
}

/** Número de asiento base de un recibo: RCPT-<invoice_number | id>. */
export function entryNumberBase(receipt: {
  id: number;
  invoice_number?: string | null;
}): string {
  return `RCPT-${receipt.invoice_number?.trim() || receipt.id}`.slice(0, 90);
}

/**
 * Primer número libre para `base` (el índice (company_id, entry_number) es único): base,
 * luego base-2, base-3… Reserva el elegido en `used`.
 */
export function pickEntryNumber(base: string, used: Set<string>): string {
  let candidate = base;
  for (let n = 2; used.has(candidate); n++) {
    candidate = `${base}-${n}`;
  }
  used.add(candidate);
  return candidate;
}

/** Fecha de calendario (YYYY-MM-DD) de un timestamp sin zona leído por pg como hora local. */
export function calendarDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Escapa los comodines de LIKE/ILIKE (\, % y _) de un texto de búsqueda. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
