import { Receipt } from '../entities/receipt.entity';
import { ReceiptAuditAction } from './receipt-audit-action.enum';
import {
  ReceiptAuditLog,
  ReceiptTotalsSnapshot,
} from './entities/receipt-audit-log.entity';

/** Usuario autenticado que ejecuta una acción sobre un recibo (auditoría, bloqueo fiscal). */
export interface ReceiptActor {
  id: number;
  role: string;
}

/** Actor de auditoría a partir de `req.user` (null si la petición no trae usuario). */
export function receiptActorOf(
  user?: { id?: number | null; role?: string | null } | null,
): ReceiptActor | null {
  return user?.id ? { id: user.id, role: user.role ?? '' } : null;
}

export interface ReceiptAuditInput {
  receipt: Pick<Receipt, 'id' | 'merchant_id'>;
  action: ReceiptAuditAction;
  actor?: ReceiptActor | null;
  previous?: ReceiptTotalsSnapshot | null;
  next?: ReceiptTotalsSnapshot | null;
  metadata?: Record<string, unknown> | null;
}

/** Decimal (string de Postgres o number) → número redondeado al centavo. */
function money(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

/** Totales críticos de un recibo para comparar antes / después de un evento. */
export function snapshotTotals(
  receipt: Pick<
    Receipt,
    'subtotal' | 'total_tax' | 'total_discount' | 'grand_total'
  >,
): ReceiptTotalsSnapshot {
  return {
    subtotal: money(receipt.subtotal),
    total_tax: money(receipt.total_tax),
    total_discount: money(receipt.total_discount),
    grand_total: money(receipt.grand_total),
  };
}

/**
 * Fila de receipt_audit_logs para un evento. Función pura: la usan ReceiptAuditService y los
 * flujos que escriben dentro de su propia transacción (p. ej. la liquidación de órdenes).
 * created_at lo pone la base de datos (clock_timestamp()).
 */
export function buildReceiptAuditEntry(
  input: ReceiptAuditInput,
): Partial<ReceiptAuditLog> {
  return {
    receipt_id: input.receipt.id,
    merchant_id: input.receipt.merchant_id,
    action: input.action,
    user_id: input.actor?.id ?? null,
    role: input.actor?.role ?? null,
    previous_values: input.previous ?? null,
    new_values: input.next ?? null,
    metadata: input.metadata ?? null,
  };
}

/**
 * Eventos de un recibo que nace ya bloqueado al liquidar una orden (orders.processPayment):
 * CREATED con sus totales y LOCKED inmediatamente después, ambos con el usuario y rol que
 * cobran. Se guardan dentro de la transacción de la liquidación.
 */
export function buildSettlementAuditEntries(
  receipt: Pick<
    Receipt,
    | 'id'
    | 'merchant_id'
    | 'subtotal'
    | 'total_tax'
    | 'total_discount'
    | 'grand_total'
    | 'invoice_number'
    | 'type'
    | 'currency'
    | 'order_id'
  >,
  actor: ReceiptActor | null,
): Partial<ReceiptAuditLog>[] {
  const totals = snapshotTotals(receipt);
  const metadata = {
    source: 'order_settlement',
    order_id: receipt.order_id,
    invoice_number: receipt.invoice_number ?? null,
    type: receipt.type,
    currency: receipt.currency,
  };
  return [
    buildReceiptAuditEntry({
      receipt,
      action: ReceiptAuditAction.CREATED,
      actor,
      next: totals,
      metadata,
    }),
    buildReceiptAuditEntry({
      receipt,
      action: ReceiptAuditAction.LOCKED,
      actor,
      previous: totals,
      next: totals,
      metadata: { source: 'order_settlement' },
    }),
  ];
}
