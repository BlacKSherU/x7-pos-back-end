import { TaxLiabilityReportDto } from '../dto/tax-liability-report.dto';
import {
  DiscountAuditRowDto,
  DiscountAuditSummaryDto,
} from '../dto/discount-audit-report.dto';
import { buildCsv, CsvValue } from './csv.util';

export const TAX_LIABILITY_CSV_HEADERS = [
  'Currency',
  'Tax Name',
  'Scope',
  'Rate (%)',
  'Taxable Subtotal',
  'Tax Collected',
  'Tax Lines',
  'Receipts',
];

/** Importe con 2 decimales fijos (texto numérico: Excel lo lee como número). */
function money(value: number): string {
  return value.toFixed(2);
}

/**
 * CSV del pasivo de impuestos: una fila por grupo y, por moneda, subtotales por scope y el
 * TOTAL (mismas cifras que `totals_by_currency`, que suman exactamente los grupos).
 */
export function taxLiabilityCsv(report: TaxLiabilityReportDto): string {
  const rows: CsvValue[][] = report.groups.map((g) => [
    g.currency,
    g.name,
    g.scope,
    money(g.rate),
    money(g.taxable_subtotal),
    money(g.tax_collected),
    g.tax_lines,
    g.receipts,
  ]);

  for (const totals of report.totals_by_currency) {
    for (const scope of totals.by_scope) {
      rows.push([
        totals.currency,
        `SUBTOTAL ${scope.scope}`,
        scope.scope,
        '',
        money(scope.taxable_subtotal),
        money(scope.tax_collected),
        scope.tax_lines,
        '',
      ]);
    }
    rows.push([
      totals.currency,
      'TOTAL',
      '',
      '',
      money(totals.taxable_subtotal),
      money(totals.tax_collected),
      totals.tax_lines,
      totals.receipts,
    ]);
  }

  return buildCsv(TAX_LIABILITY_CSV_HEADERS, rows);
}

export const DISCOUNT_AUDIT_CSV_HEADERS = [
  'Receipt ID',
  'Invoice Number',
  'Receipt Type',
  'Order ID',
  'Order Number',
  'Created At',
  'Updated At',
  'Events',
  'Status',
  'Locked',
  'Processed By User ID',
  'Processed By',
  'Processed By Role',
  'Currency',
  'Original Subtotal',
  'Discount Applied',
  'Discount (%)',
  'Total Tax',
  'Final Total',
  'Order Items',
  'Payment Methods',
];

/** CSV de la auditoría de descuentos/anulaciones con una fila TOTAL por moneda al final. */
export function discountAuditCsv(
  rows: DiscountAuditRowDto[],
  summary: DiscountAuditSummaryDto,
): string {
  const lines: CsvValue[][] = rows.map((r) => [
    r.receipt_id,
    r.invoice_number,
    r.receipt_type,
    r.order_id,
    r.snapshot?.order_number ?? '',
    r.created_at,
    r.updated_at,
    r.events.join(' + '),
    r.is_active ? 'ACTIVE' : 'VOIDED',
    r.is_locked ? 'YES' : 'NO',
    r.processed_by_user_id,
    r.processed_by_name,
    r.processed_by_role,
    r.currency,
    money(r.original_subtotal),
    money(r.discount_applied),
    r.discount_pct === null ? '' : money(r.discount_pct),
    money(r.total_tax),
    money(r.final_total),
    r.snapshot?.items_summary ?? '',
    r.snapshot?.payment_methods ?? '',
  ]);

  for (const c of summary.by_currency) {
    lines.push([
      'TOTAL',
      `${c.receipts} receipts`,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      c.currency,
      money(c.original_subtotal),
      money(c.discount_applied),
      '',
      money(c.total_tax),
      money(c.final_total),
      '',
      '',
    ]);
  }

  return buildCsv(DISCOUNT_AUDIT_CSV_HEADERS, lines);
}
