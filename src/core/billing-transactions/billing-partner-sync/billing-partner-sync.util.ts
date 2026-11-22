/**
 * Expresiones SQL y utilidades del cruce Billing ↔ Business Partners.
 *
 * Alias usados por las consultas (ver BillingPartnerSyncService.receiptsQuery):
 *   r  = receipts            o  = orders (orden del recibo)
 *   oc = customer de la orden  lc = customer enlazado en el recibo
 *   ls = supplier enlazado en el recibo
 *
 * Socio efectivo de un recibo:
 *   1. Proveedor enlazado (r.supplier_id), si existe.
 *   2. Cliente enlazado (r.customer_id), si existe.
 *   3. Si no hay enlace explícito, el cliente de la orden (o.customer_id).
 */

/** El recibo tiene enlace explícito con un socio (LINK CUSTOMER PROFILE). */
export const EXPLICIT_LINK_SQL =
  '(r.customer_id IS NOT NULL OR r.supplier_id IS NOT NULL)';

/** El recibo no tiene enlace explícito: usa el cliente de la orden. */
export const NO_EXPLICIT_LINK_SQL =
  '(r.customer_id IS NULL AND r.supplier_id IS NULL)';

/**
 * Factura B2B: recibo de tipo INVOICE (documento fiscal empresa-empresa) o cualquier recibo que
 * un usuario enlazó explícitamente con un socio. Requiere el parámetro :invoiceType.
 */
export const B2B_INVOICE_SQL = `(r.type = :invoiceType OR ${EXPLICIT_LINK_SQL})`;

export const PARTNER_TYPE_SQL =
  "CASE WHEN r.supplier_id IS NOT NULL THEN 'supplier' ELSE 'customer' END";

export const PARTNER_ID_SQL =
  'CASE WHEN r.supplier_id IS NOT NULL THEN r.supplier_id ELSE COALESCE(r.customer_id, o.customer_id) END';

/** Cliente efectivo (NULL cuando el recibo está enlazado a un proveedor). */
export const EFFECTIVE_CUSTOMER_SQL =
  'CASE WHEN r.supplier_id IS NULL THEN COALESCE(r.customer_id, o.customer_id) END';

export const PARTNER_NAME_SQL =
  'CASE WHEN r.supplier_id IS NOT NULL THEN ls.name WHEN r.customer_id IS NOT NULL THEN lc.name ELSE oc.name END';

export const PARTNER_TAX_ID_SQL =
  'CASE WHEN r.supplier_id IS NOT NULL THEN ls.tax_id WHEN r.customer_id IS NOT NULL THEN lc.document_id ELSE oc.document_id END';

export const LINK_SOURCE_SQL = `CASE WHEN ${EXPLICIT_LINK_SQL} THEN 'receipt' ELSE 'order' END`;

/** Monto decimal (string de Postgres o number) a centavos enteros. */
export function toCents(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

/** Centavos enteros a monto con 2 decimales. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

/** Conteos / sumas que Postgres devuelve como string (bigint, numeric). */
export function toInt(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Escapa los comodines de LIKE/ILIKE (%, _ y la barra invertida). */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * tax_id del JSON fiscal_data del recibo (`{"tax_id": "..."}`). Acepta también `taxId` / `rut`.
 * Devuelve null si fiscal_data está vacío, no es JSON o no trae identificador fiscal.
 */
export function extractFiscalTaxId(fiscalData: unknown): string | null {
  if (typeof fiscalData !== 'string' || !fiscalData.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(fiscalData);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    for (const key of ['tax_id', 'taxId', 'rut']) {
      const value = record[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
      if (typeof value === 'number') return String(value);
    }
    return null;
  } catch {
    return null;
  }
}

/** Compañía a la que está asociado el socio (customer.companyId / supplier.company_id). */
export const PARTNER_COMPANY_ID_SQL =
  'CASE WHEN r.supplier_id IS NOT NULL THEN ls.company_id WHEN r.customer_id IS NOT NULL THEN lc.companyId ELSE oc.companyId END';

/** Sucursal que registró al cliente (NULL en proveedores). */
export const PARTNER_MERCHANT_ID_SQL =
  'CASE WHEN r.supplier_id IS NOT NULL THEN NULL WHEN r.customer_id IS NOT NULL THEN lc.merchantId ELSE oc.merchantId END';
