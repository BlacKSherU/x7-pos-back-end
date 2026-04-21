import { OrderItem } from '../order-item/entities/order-item.entity';
import { OrderItemStatus } from '../order-item/constants/order-item-status.enum';
import { OrderPayment } from '../order-payments/entities/order-payment.entity';
import { OrderTax } from '../order-taxes/entities/order-tax.entity';
import { KitchenStatus } from './constants/kitchen-status.enum';

export function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function lineSubtotal(
  item: Pick<OrderItem, 'quantity' | 'price' | 'discount'>,
): number {
  const qty = Number(item.quantity);
  const price = Number(item.price);
  const disc = Number(item.discount ?? 0);
  return roundMoney(qty * price - disc);
}

/** Sum of tax line amounts for the order. */
export function computeTaxTotalFromOrderTaxes(
  taxes: Pick<OrderTax, 'amount'>[],
): number {
  if (taxes.length === 0) return 0;
  return roundMoney(taxes.reduce((sum, t) => sum + Number(t.amount), 0));
}

/** Sum of tip_amount per payment row (refunds subtract tips like amounts). */
export function computeTipTotalFromPayments(
  payments: Pick<OrderPayment, 'tip_amount' | 'is_refund'>[],
): number {
  return roundMoney(
    payments.reduce((sum, p) => {
      const tip = roundMoney(Number(p.tip_amount ?? 0));
      return sum + (p.is_refund ? -tip : tip);
    }, 0),
  );
}

/** Net amount collected from payment rows (refunds subtract). Includes tip_amount per row. */
export function computePaidTotalFromPayments(
  payments: Pick<OrderPayment, 'amount' | 'tip_amount' | 'is_refund'>[],
): number {
  return roundMoney(
    payments.reduce((sum, p) => {
      const amt = roundMoney(Number(p.amount) + Number(p.tip_amount ?? 0));
      return sum + (p.is_refund ? -amt : amt);
    }, 0),
  );
}

/**
 * Subtotal from active lines plus optional modifier add-ons per order item id.
 * Modifier add-on map values are precomputed (e.g. sum(modifier.price × line qty) per item).
 */
export function computeSubtotalFromItems(
  items: OrderItem[],
  modifierAddonByOrderItemId: Map<number, number> = new Map(),
): number {
  const active = items.filter((i) => i.status === OrderItemStatus.ACTIVE);
  if (active.length === 0) return 0;
  return roundMoney(
    active.reduce((sum, i) => {
      const stored = Number(i.total_price);
      const line = Number.isFinite(stored) ? stored : lineSubtotal(i);
      const modAdd = roundMoney(modifierAddonByOrderItemId.get(i.id) ?? 0);
      return sum + line + modAdd;
    }, 0),
  );
}

function normalizeLineKitchenStatus(raw: string): string {
  const v = String(raw).toLowerCase();
  if (['pending', 'in_preparation', 'ready', 'served'].includes(v)) return v;
  if (v === 'preparing' || v === 'sent') return 'in_preparation';
  if (v === 'completed') return 'served';
  if (v === 'cancelled') return 'cancelled';
  return 'pending';
}

export function computeOrderTotal(
  subtotal: number,
  discountTotal: number,
  taxTotal: number,
  tipTotal: number,
  deliveryFee: number,
): number {
  return roundMoney(
    roundMoney(subtotal) -
      roundMoney(discountTotal) +
      roundMoney(taxTotal) +
      roundMoney(tipTotal) +
      roundMoney(deliveryFee),
  );
}

export function deriveKitchenStatusFromItems(
  items: Pick<OrderItem, 'status' | 'kitchen_status'>[],
): KitchenStatus {
  const active = items.filter((i) => i.status === OrderItemStatus.ACTIVE);
  if (active.length === 0) return KitchenStatus.PENDING;

  const keys = active.map((i) => normalizeLineKitchenStatus(i.kitchen_status));

  if (keys.every((k) => k === 'cancelled')) {
    return KitchenStatus.CANCELLED;
  }
  const nonCancelled = keys.filter((k) => k !== 'cancelled');
  if (nonCancelled.length === 0) return KitchenStatus.CANCELLED;

  if (nonCancelled.every((k) => k === 'served')) {
    return KitchenStatus.COMPLETED;
  }
  if (nonCancelled.some((k) => k === 'in_preparation')) {
    return KitchenStatus.PREPARING;
  }
  if (nonCancelled.some((k) => k === 'ready')) {
    return KitchenStatus.READY;
  }
  if (nonCancelled.every((k) => k === 'pending')) {
    return KitchenStatus.PENDING;
  }
  return KitchenStatus.SENT;
}

export function applyPaidDerivedFields(order: {
  total: number;
  paid_total: number;
  balance_due: number;
  is_paid: boolean;
}): void {
  order.balance_due = roundMoney(
    roundMoney(order.total) - roundMoney(order.paid_total),
  );
  order.is_paid = order.balance_due === 0;
}
