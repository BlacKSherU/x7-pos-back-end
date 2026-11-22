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

/**
 * Cruza los totales del recibo con sus impuestos y con las líneas de sus asientos
 * no anulados. `ledgerLines` vacío ⇒ las banderas del libro mayor quedan en null.
 */
export function reconcileReceipt(
  receipt: ReceiptTotalsInput,
  activeTaxAmounts: readonly (number | string)[],
  ledgerLines: readonly LedgerLineInput[],
): LedgerReconciliation {
  const subtotal = toCents(receipt.subtotal);
  const tax = toCents(receipt.total_tax);
  const discount = toCents(receipt.total_discount);
  const grandTotal = toCents(receipt.grand_total);
  const taxRecords = activeTaxAmounts.reduce<number>(
    (sum, amount) => sum + toCents(amount),
    0,
  );

  let debit = 0;
  let credit = 0;
  let assetNetDebit = 0;
  let liabilityNetCredit = 0;
  for (const line of ledgerLines) {
    const lineDebit = toCents(line.debit);
    const lineCredit = toCents(line.credit);
    debit += lineDebit;
    credit += lineCredit;
    if (line.account_type === AccountType.ASSET) {
      assetNetDebit += lineDebit - lineCredit;
    } else if (line.account_type === AccountType.LIABILITY) {
      liabilityNetCredit += lineCredit - lineDebit;
    }
  }

  const hasLedger = ledgerLines.length > 0;
  const receiptTotalsConsistent = subtotal + tax - discount === grandTotal;
  const receiptTaxesMatchTotal = taxRecords === tax;
  const entriesBalanced = hasLedger ? debit === credit : null;
  const grandTotalMatchesAssets = hasLedger
    ? assetNetDebit === grandTotal
    : null;
  const taxMatchesLiabilities = hasLedger ? liabilityNetCredit === tax : null;

  return {
    ledger_total_debit: fromCents(debit),
    ledger_total_credit: fromCents(credit),
    asset_net_debit: fromCents(assetNetDebit),
    liability_net_credit: fromCents(liabilityNetCredit),
    receipt_taxes_total: fromCents(taxRecords),
    verification: {
      receipt_totals_consistent: receiptTotalsConsistent,
      receipt_taxes_match_total: receiptTaxesMatchTotal,
      entries_balanced: entriesBalanced,
      grand_total_matches_assets: grandTotalMatchesAssets,
      tax_matches_liabilities: taxMatchesLiabilities,
      is_balanced: hasLedger
        ? receiptTotalsConsistent &&
          receiptTaxesMatchTotal &&
          entriesBalanced === true &&
          grandTotalMatchesAssets === true &&
          taxMatchesLiabilities === true
        : null,
    },
  };
}

/** Escapa los comodines de LIKE/ILIKE (\, % y _) de un texto de búsqueda. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
