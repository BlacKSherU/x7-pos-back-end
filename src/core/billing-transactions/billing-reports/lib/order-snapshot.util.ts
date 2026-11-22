import { OrderSnapshotSummaryDto } from '../dto/discount-audit-report.dto';
import { fromCents, toCents } from './report-utils';

const MAX_ITEMS_IN_SUMMARY = 10;

type SnapshotRecord = Record<string, unknown>;

function isRecord(value: unknown): value is SnapshotRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `order_snapshot` es jsonb, pero registros viejos o importados pueden traerlo como texto. */
export function parseOrderSnapshot(snapshot: unknown): SnapshotRecord | null {
  if (isRecord(snapshot)) return snapshot;
  if (typeof snapshot === 'string' && snapshot.trim()) {
    try {
      const parsed: unknown = JSON.parse(snapshot);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

function firstDefined(record: SnapshotRecord, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function asText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asMoney(value: unknown): number | null {
  return asNumber(value) === null ? null : fromCents(toCents(value));
}

function describeItem(item: unknown): string | null {
  if (!isRecord(item)) return null;
  const quantity = asNumber(firstDefined(item, ['quantity', 'qty']));
  const productId = asText(firstDefined(item, ['product_id', 'productId']));
  const name =
    asText(firstDefined(item, ['productName', 'product_name', 'name'])) ??
    (productId ? `Product #${productId}` : 'Item');
  return quantity === null ? name : `${quantity} x ${name}`;
}

/**
 * Resume `order_snapshot` (lo escribe OrdersService al cobrar: orderId, orderNumber, subtotal,
 * discountTotal, total, items[], payments[]). Tolera claves en snake_case y datos incompletos.
 */
export function summarizeOrderSnapshot(
  snapshot: unknown,
): OrderSnapshotSummaryDto | null {
  const snap = parseOrderSnapshot(snapshot);
  if (!snap) return null;

  const items = Array.isArray(snap.items) ? (snap.items as unknown[]) : [];
  const described = items
    .map(describeItem)
    .filter((text): text is string => text !== null);
  const shown = described.slice(0, MAX_ITEMS_IN_SUMMARY);
  const hidden = described.length - shown.length;
  const itemsSummary =
    shown.join('; ') + (hidden > 0 ? `; +${hidden} more` : '');

  const payments = Array.isArray(snap.payments)
    ? (snap.payments as unknown[])
    : [];
  const methods = Array.from(
    new Set(
      payments
        .map((p) => (isRecord(p) ? asText(p.method) : null))
        .filter((m): m is string => m !== null),
    ),
  );

  const orderId = asNumber(firstDefined(snap, ['orderId', 'order_id']));

  return {
    order_id: orderId === null ? null : Math.trunc(orderId),
    order_number: asText(firstDefined(snap, ['orderNumber', 'order_number'])),
    item_count: items.length,
    items_summary: itemsSummary,
    payment_methods: methods.join(', '),
    subtotal: asMoney(snap.subtotal),
    discount_total: asMoney(
      firstDefined(snap, ['discountTotal', 'discount_total']),
    ),
    total: asMoney(snap.total),
  };
}
